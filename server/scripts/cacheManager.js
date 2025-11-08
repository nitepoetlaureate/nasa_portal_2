#!/usr/bin/env node

/**
 * Redis Cache Management Utility
 *
 * This utility provides commands to:
 * - View cache statistics
 * - Clear specific cache entries
 * - Clear all caches
 * - Monitor cache performance
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`🔧 ${title}`);
  console.log('='.repeat(60));
}

function printDivider() {
  console.log('-'.repeat(60));
}

function checkRedisConnection() {
  try {
    const result = execSync('redis-cli ping', { encoding: 'utf8' }).trim();
    return result === 'PONG';
  } catch (error) {
    return false;
  }
}

function getCacheInfo() {
  try {
    // Get Redis info
    const info = execSync('redis-cli info memory', { encoding: 'utf8' });
    const keyCount = execSync('redis-cli dbsize', { encoding: 'utf8' }).trim();

    console.log('\n📊 Redis Memory Usage:');
    const lines = info.split('\n');
    lines.forEach(line => {
      if (line.includes('used_memory_human') ||
          line.includes('used_memory_peak_human') ||
          line.includes('total_system_memory_human')) {
        console.log(`   ${line.replace(/:/, ': ')}`);
      }
    });

    console.log(`\n📦 Total Keys in Database: ${keyCount}`);

    // Get NASA-specific cache keys
    const nasaKeys = execSync('redis-cli keys "nasa:*"', { encoding: 'utf8' }).trim();
    if (nasaKeys) {
      const keyList = nasaKeys.split('\n').filter(k => k.trim());
      console.log(`🚀 NASA Cache Keys: ${keyList.length}`);

      // Group by endpoint type
      const apodKeys = keyList.filter(k => k.includes('apod')).length;
      const neoKeys = keyList.filter(k => k.includes('neo')).length;
      const resourceKeys = keyList.filter(k => k.includes('resource')).length;
      const otherKeys = keyList.length - apodKeys - neoKeys - resourceKeys;

      console.log(`   APOD entries: ${apodKeys}`);
      console.log(`   NEO entries: ${neoKeys}`);
      console.log(`   Resource entries: ${resourceKeys}`);
      console.log(`   Other entries: ${otherKeys}`);
    }

  } catch (error) {
    console.error('❌ Error getting cache info:', error.message);
  }
}

function listCacheEntries(pattern = 'nasa:*') {
  try {
    console.log(`\n🔍 Cache entries matching: ${pattern}`);

    const keys = execSync(`redis-cli keys "${pattern}"`, { encoding: 'utf8' }).trim();

    if (!keys) {
      console.log('   📭 No cache entries found');
      return;
    }

    const keyList = keys.split('\n').filter(key => key.trim());

    keyList.forEach((key, index) => {
      try {
        const ttl = execSync(`redis-cli ttl "${key}"`, { encoding: 'utf8' }).trim();
        const type = execSync(`redis-cli type "${key}"`, { encoding: 'utf8' }).trim();
        const size = execSync(`redis-cli debug object "${key}"`, { encoding: 'utf8' });

        let sizeInfo = '';
        if (size.includes('serializedlength')) {
          const sizeMatch = size.match(/serializedlength:(\d+)/);
          if (sizeMatch) {
            const sizeBytes = parseInt(sizeMatch[1]);
            const sizeKB = (sizeBytes / 1024).toFixed(2);
            sizeInfo = ` (${sizeKB} KB)`;
          }
        }

        console.log(`   ${index + 1}. ${key}`);
        console.log(`      TTL: ${ttl === '-1' ? 'No expiry' : ttl === '-2' ? 'Expired' : `${ttl}s`} | Type: ${type}${sizeInfo}`);

      } catch (keyError) {
        console.log(`   ${index + 1}. ${key} (Error getting details)`);
      }
    });

  } catch (error) {
    console.error('❌ Error listing cache entries:', error.message);
  }
}

function clearCachePattern(pattern, confirm = false) {
  if (!confirm) {
    rl.question(`⚠️  Are you sure you want to delete all cache entries matching "${pattern}"? (y/N): `, (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        clearCachePattern(pattern, true);
      } else {
        console.log('❌ Cache clearing cancelled.');
      }
      rl.close();
    });
    return;
  }

  try {
    console.log(`\n🗑️  Clearing cache entries matching: ${pattern}`);

    const keys = execSync(`redis-cli keys "${pattern}"`, { encoding: 'utf8' }).trim();

    if (!keys) {
      console.log('   📭 No cache entries found to delete');
      rl.close();
      return;
    }

    const keyList = keys.split('\n').filter(key => key.trim());
    console.log(`   📊 Found ${keyList.length} entries to delete...`);

    let deleted = 0;
    keyList.forEach(key => {
      try {
        execSync(`redis-cli del "${key}"`, { encoding: 'utf8' });
        deleted++;
      } catch (error) {
        console.warn(`   ⚠️  Failed to delete: ${key}`);
      }
    });

    console.log(`   ✅ Successfully deleted ${deleted}/${keyList.length} cache entries`);

  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  }

  rl.close();
}

function clearAllCaches(confirm = false) {
  if (!confirm) {
    rl.question('⚠️  Are you sure you want to delete ALL NASA cache entries? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        clearAllCaches(true);
      } else {
        console.log('❌ Cache clearing cancelled.');
      }
      rl.close();
    });
    return;
  }

  clearCachePattern('nasa:*', true);
}

function showCacheStats() {
  printHeader('Cache Statistics');

  if (!checkRedisConnection()) {
    console.log('❌ Redis is not connected or not running');
    rl.close();
    return;
  }

  console.log('✅ Redis server is connected');
  getCacheInfo();
  printDivider();
  listCacheEntries();
  printDivider();

  // Show TTL recommendations
  console.log('💡 Cache TTL Recommendations:');
  console.log('   APOD (Astronomy Picture of Day): 24 hours (changes daily)');
  console.log('   NEO (Near Earth Objects): 30 minutes (data changes frequently)');
  console.log('   Resource metadata: 2 hours (moderately static)');
  console.log('   General NASA API: 1 hour (balanced freshness/performance)');

  rl.close();
}

function showMenu() {
  printHeader('Redis Cache Manager');

  if (!checkRedisConnection()) {
    console.log('❌ Redis is not connected or not running');
    console.log('Please ensure Redis server is running before using this utility.');
    rl.close();
    return;
  }

  console.log('✅ Redis server is connected');
  console.log('\n📋 Available commands:');
  console.log('1. Show cache statistics');
  console.log('2. List all NASA cache entries');
  console.log('3. List APOD cache entries');
  console.log('4. List NEO cache entries');
  console.log('5. List Resource cache entries');
  console.log('6. Clear specific cache pattern');
  console.log('7. Clear all APOD cache');
  console.log('8. Clear all NEO cache');
  console.log('9. Clear all Resource cache');
  console.log('10. Clear ALL NASA cache');
  console.log('0. Exit');

  rl.question('\n🎯 Enter your choice (0-10): ', (choice) => {
    switch (choice.trim()) {
      case '1':
        showCacheStats();
        break;
      case '2':
        printHeader('All NASA Cache Entries');
        listCacheEntries('nasa:*');
        rl.close();
        break;
      case '3':
        printHeader('APOD Cache Entries');
        listCacheEntries('nasa:*apod*');
        rl.close();
        break;
      case '4':
        printHeader('NEO Cache Entries');
        listCacheEntries('nasa:*neo*');
        rl.close();
        break;
      case '5':
        printHeader('Resource Cache Entries');
        listCacheEntries('nasa:*resource*');
        rl.close();
        break;
      case '6':
        rl.question('Enter cache pattern to clear (e.g., nasa:*apod*): ', (pattern) => {
          if (pattern.trim()) {
            clearCachePattern(pattern.trim());
          } else {
            console.log('❌ No pattern provided');
            rl.close();
          }
        });
        break;
      case '7':
        clearCachePattern('nasa:*apod*');
        break;
      case '8':
        clearCachePattern('nasa:*neo*');
        break;
      case '9':
        clearCachePattern('nasa:*resource*');
        break;
      case '10':
        clearAllCaches();
        break;
      case '0':
        console.log('👋 Goodbye!');
        rl.close();
        break;
      default:
        console.log('❌ Invalid choice. Please enter a number between 0 and 10.');
        rl.close();
    }
  });
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Redis Cache Manager for NASA System 7 Portal');
  console.log('\nUsage: node cacheManager.js [command]');
  console.log('\nCommands:');
  console.log('  --help, -h     Show this help message');
  console.log('  --stats        Show cache statistics');
  console.log('  --list         List all cache entries');
  console.log('  --clear [pat]  Clear cache entries (pattern optional)');
  console.log('  --clear-all    Clear all NASA cache entries');
  console.log('\nExamples:');
  console.log('  node cacheManager.js --stats');
  console.log('  node cacheManager.js --list');
  console.log('  node cacheManager.js --clear "nasa:*apod*"');
  console.log('  node cacheManager.js --clear-all');
  process.exit(0);
}

if (args.includes('--stats')) {
  showCacheStats();
} else if (args.includes('--list')) {
  printHeader('All NASA Cache Entries');
  if (checkRedisConnection()) {
    listCacheEntries();
  } else {
    console.log('❌ Redis is not connected');
  }
  rl.close();
} else if (args.includes('--clear')) {
  const patternIndex = args.indexOf('--clear') + 1;
  const pattern = patternIndex < args.length ? args[patternIndex] : 'nasa:*';
  clearCachePattern(pattern);
} else if (args.includes('--clear-all')) {
  clearAllCaches();
} else {
  // Show interactive menu
  showMenu();
}
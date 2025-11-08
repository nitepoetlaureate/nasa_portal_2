# Database subnet group
resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db-subnet-group"
  })
}

# RDS Security Group
resource "aws_security_group" "rds" {
  name_prefix = "${local.name_prefix}-rds-"
  vpc_id      = module.vpc.vpc_id

  # Application access
  ingress {
    description = "Application access"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # Admin access from bastion (if exists)
  ingress {
    description = "Admin access"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # VPC CIDR
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-rds-sg"
  })
}

# RDS Parameter Group
resource "aws_db_parameter_group" "main" {
  family = "postgres15"
  name   = "${local.name_prefix}-pg-parameter-group"

  parameters {
    name  = "log_statement"
    value = "all"
  }

  parameters {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameters {
    name  = "max_connections"
    value = "200"
  }

  parameters {
    name  = "shared_buffers"
    value = "256MB"
  }

  parameters {
    name  = "effective_cache_size"
    value = "1GB"
  }

  tags = local.common_tags
}

# RDS Option Group
resource "aws_db_option_group" "main" {
  name                 = "${local.name_prefix}-pg-option-group"
  option_group_description = "Option group for NASA System 7 Portal PostgreSQL"
  engine_name         = "postgres"
  major_engine_version = "15"

  tags = local.common_tags
}

# Primary PostgreSQL Database
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-db"

  engine         = "postgres"
  engine_version = var.postgres_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.database_name
  username = var.database_username
  password = var.database_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  parameter_group_name   = aws_db_parameter_group.main.name
  option_group_name      = aws_db_option_group.main.name

  # Backup and maintenance
  backup_retention_period = var.backup_retention_period
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  copy_tags_to_snapshot  = true
  delete_automated_backups = false

  # High availability
  multi_az = local.environment == "production"

  # Performance insights
  performance_insights_enabled = local.environment != "development"
  performance_insights_retention_period = local.environment == "production" ? 7 : 2

  # Deletion protection
  skip_final_snapshot = local.environment != "production"
  deletion_protection = local.environment == "production"

  # Monitoring
  monitoring_interval = local.environment == "production" ? 60 : 0
  monitoring_role_arn = local.environment == "production" ? aws_iam_role.rds_enhanced_monitoring.arn : null

  # CloudWatch logs
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database"
  })
}

# Read Replica for production
resource "aws_db_instance" "read_replica" {
  count = local.environment == "production" ? 1 : 0

  identifier = "${local.name_prefix}-db-read-replica"

  replicate_source_db = aws_db_instance.main.identifier
  instance_class       = var.db_read_replica_class

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Performance insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7

  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_enhanced_monitoring.arn

  # CloudWatch logs
  enabled_cloudwatch_logs_exports = ["postgresql"]

  skip_final_snapshot = true
  apply_immediately   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database-read-replica"
    Type = "Read Replica"
  })
}

# Enhanced Monitoring IAM Role
resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = local.environment == "production" ? 1 : 0

  name = "${local.name_prefix}-rds-enhanced-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = local.environment == "production" ? 1 : 0
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
}

# Redis (ElastiCache) Security Group
resource "aws_security_group" "redis" {
  name_prefix = "${local.name_prefix}-redis-"
  vpc_id      = module.vpc.vpc_id

  # Application access
  ingress {
    description = "Application access"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  # Admin access from VPC
  ingress {
    description = "Admin access"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-sg"
  })
}

# Redis Subnet Group
resource "aws_elasticache_subnet_group" "main" {
  name       = "${local.name_prefix}-cache-subnet-group"
  subnet_ids = module.vpc.private_subnets

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cache-subnet-group"
  })
}

# Redis Parameter Group
resource "aws_elasticache_parameter_group" "main" {
  family = "redis7.x"
  name   = "${local.name_prefix}-redis-parameter-group"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = local.common_tags
}

# Redis (ElastiCache) Replication Group
resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.name_prefix}-cache"
  description                = "Redis cache for NASA System 7 Portal"

  node_type            = var.redis_node_type
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.main.name

  num_cache_clusters = var.redis_num_cache_nodes
  automatic_failover_enabled = local.environment == "production"
  multi_az_enabled = local.environment == "production"

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = var.redis_auth_token

  # Backup
  snapshot_retention_limit = local.environment == "production" ? 7 : 1
  snapshot_window         = "06:00-07:00"
  maintenance_window      = "sun:05:00-sun:06:00"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow.name
    destination_type = "cloudwatch-logs"
    log_format       = "text"
    log_type         = "slow-log"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-cache"
  })
}

# CloudWatch Log Group for Redis
resource "aws_cloudwatch_log_group" "redis_slow" {
  name              = "/aws/elasticache/redis/${local.name_prefix}-cache/slow-log"
  retention_in_days = 14

  tags = local.common_tags
}

# Database credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "database_credentials" {
  name = "${local.name_prefix}/database-credentials"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-database-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    username = var.database_username
    password = var.database_password
    host     = aws_db_instance.main.endpoint
    port     = 5432
    dbname   = var.database_name
  })
}

# Redis credentials in AWS Secrets Manager
resource "aws_secretsmanager_secret" "redis_credentials" {
  name = "${local.name_prefix}/redis-credentials"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-credentials"
  })
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host     = aws_elasticache_replication_group.main.primary_endpoint_address
    port     = 6379
    password = var.redis_auth_token
  })
}
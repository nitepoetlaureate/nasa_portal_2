# React Performance Optimization

Analyze and optimize React components for better performance, focusing on large NASA data visualizations.

## Usage

```bash
/react-performance [--analyze] [--optimize] [--bundle] [--memory]
```

## Options

- `--analyze` - Analyze current performance bottlenecks
- `--optimize` - Apply performance optimizations
- `--bundle` - Analyze and optimize bundle size
- `--memory` - Check for memory leaks and optimize memory usage

## Performance Areas

### Rendering Optimization
- React.memo for component memoization
- useMemo for expensive calculations
- useCallback for function references
- Code splitting with React.lazy
- Virtual scrolling for large datasets

### Bundle Optimization
- Tree shaking unused imports
- Dynamic imports for code splitting
- Bundle analysis and size reduction
- Asset optimization and compression

### Memory Optimization
- Cleanup in useEffect hooks
- Event listener removal
- Canvas and WebGL resource management
- Large dataset handling strategies

## NASA Data Visualization Specific

- Optimize D3.js rendering for space data
- Implement canvas-based rendering for large datasets
- Use Web Workers for heavy computations
- Implement efficient data structures for astronomical data

## Monitoring

- React DevTools Profiler integration
- Performance metrics collection
- Bundle size tracking
- Memory usage monitoring
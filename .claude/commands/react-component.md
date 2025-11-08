# React Component Development

Optimize React components with best practices for performance, accessibility, and maintainability.

## Usage

```bash
/react-component ComponentName [--type=component|page|hook] [--storybook] [--tests]
```

## Examples

- Create a new component: `/react-component UserProfile`
- Create a page component: `/react-component HomePage --type=page`
- Create with Storybook: `/react-component Button --type=component --storybook`
- Create with tests: `/react-component DataTable --tests`

## Component Types

- `component` - Reusable UI component (default)
- `page` - Page-level component with routing
- `hook` - Custom React hook
- `layout` - Layout component wrapper

## Generated Features

- ✅ TypeScript interfaces for props
- ✅ Accessibility attributes (ARIA)
- ✅ Performance optimizations (memo, useMemo, useCallback)
- ✅ Error boundaries for error handling
- ✅ Responsive design with Tailwind CSS
- ✅ Storybook stories (if requested)
- ✅ Unit tests with React Testing Library (if requested)
- ✅ System 7 styling for NASA project theme

## Integration with NASA System 7

Components will be styled with the authentic System 7 aesthetic including:
- Monochrome pixel-perfect design
- Window chrome and drag handles
- System fonts and UI elements
- Retro desktop interface patterns
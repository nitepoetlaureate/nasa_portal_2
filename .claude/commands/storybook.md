# Storybook Development

Create and manage Storybook stories for React components, perfect for documenting NASA System 7 UI components.

## Usage

```bash
/storybook ComponentName [--create] [--update] [--docs] [--interactive]
```

## Options

- `--create` - Create new Storybook stories
- `--update` - Update existing stories
- `--docs` - Generate comprehensive documentation
- `interactive` - Add interactive controls and demos

## Story Types

- **Component Stories** - Basic component rendering and states
- **System 7 Stories** - Authentic retro interface demos
- **NASA Data Stories** - Examples with real space data
- **Accessibility Stories** - ARIA and keyboard navigation demos
- **Responsive Stories** - Different viewport and device testing

## Generated Features

- ✅ Multiple story variants (default, states, edge cases)
- ✅ Interactive controls for props manipulation
- ✅ System 7 theme integration
- ✅ NASA data integration examples
- ✅ Accessibility documentation
- ✅ Performance notes and optimization tips

## System 7 Component Documentation

Stories will showcase:
- Window chrome and drag functionality
- System fonts and pixel-perfect styling
- Retro UI patterns (menus, dialogs, alerts)
- Authentic color schemes and textures
- Classic Mac OS interaction patterns

## Example Generated Stories

```jsx
export default {
  title: 'System7/DesktopWindow',
  component: DesktopWindow,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    title: 'NASA Data Explorer',
    width: 600,
    height: 400,
    children: <NASADataContent />,
  },
};
```
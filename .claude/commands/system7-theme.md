# System 7 Theme Development

Create authentic Apple System 7 styled components and themes for the NASA Portal, bringing retro computing aesthetics to space data visualization.

## Usage

```bash
/system7-theme component|window|icons|fonts [--authentic] [--modern] [--responsive]
```

## System 7 Design Elements

### Window Chrome
- Title bar with classic window controls
- Draggable window functionality
- System 7 window sizing behavior
- Classic drop shadows and borders
- Window stacking and z-index management

### UI Components
- Push buttons with 3D effects
- Checkbox and radio button styling
- Classic progress bars and scrollbars
- System 7 style modals and dialogs
- Menu bar and pull-down menus

### Typography
- Chicago font for system UI
- Geneva for interface elements
- Monaco for monospace text
- Classic text rendering with proper anti-aliasing
- System font sizing and spacing

### Color Scheme
- 1-bit and 2-bit monochrome patterns
- Classic Mac OS grayscale palette
- Subtle dithering for gradients
- System highlight colors
- Authentic desktop patterns

## Generated Components

### System7Window Component
```jsx
const System7Window = ({
  title,
  width,
  height,
  children,
  closable = true,
  zoomable = true,
  resizable = true
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });

  return (
    <div
      className="system7-window"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="title-bar" onMouseDown={handleDragStart}>
        <div className="title-bar-text">{title}</div>
        <div className="window-controls">
          {closable && <div className="close-box" />}
          {zoomable && <div className="zoom-box" />}
        </div>
      </div>
      <div className="content-area">
        {children}
      </div>
      <div className="window-border" />
    </div>
  );
};
```

### System7Button Component
```jsx
const System7Button = ({
  children,
  onClick,
  disabled = false,
  variant = 'default'
}) => {
  return (
    <button
      className={`system7-button system7-button--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="button-face">
        {children}
      </span>
    </button>
  );
};
```

## Styling Implementation

### CSS for System 7 Aesthetics
```css
/* System 7 Window Styling */
.system7-window {
  position: absolute;
  background: #ffffff;
  border: 1px solid #000000;
  box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  font-family: Chicago, sans-serif;
  font-size: 12px;
}

.title-bar {
  height: 18px;
  background: linear-gradient(to bottom, #dddddd, #bbbbbb);
  border-bottom: 1px solid #000000;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2px;
  cursor: move;
}

.title-bar-text {
  font-family: Chicago, sans-serif;
  font-size: 12px;
  font-weight: bold;
  margin-left: 4px;
}

.window-controls {
  display: flex;
  gap: 2px;
}

.close-box, .zoom-box {
  width: 14px;
  height: 14px;
  border: 1px solid #000000;
  background: #dddddd;
  position: relative;
}

.close-box::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #000000;
}

/* System 7 Button Styling */
.system7-button {
  font-family: Chicago, sans-serif;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid #000000;
  background: #dddddd;
  cursor: pointer;
  position: relative;
}

.system7-button:active .button-face {
  transform: translate(1px, 1px);
}

.system7-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Desktop Pattern */
.system7-desktop {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGklEQVQYV2P8//8/Az0h7GJiYGA4BkYGhgYAoAAAheQH8kdUvAAAAAElFTkSuQmCC');
  background-repeat: repeat;
}
```

## NASA-Specific Styling

### Space Data Display Components
- Retro-style data tables with System 7 borders
- Classic file icons for different data types (planets, asteroids, missions)
- System 7 progress bars for data loading
- Vintage-style charts and graphs
- Classic alert dialogs for space weather notifications

### Icon Set Design
- Planet and celestial body icons in System 7 style
- Space mission icons with retro aesthetics
- Classic telescope and observatory icons
- Vintage rocket and spacecraft icons
- System 7 style folder icons for data organization

## Responsive Adaptation

- Touch-friendly button sizing for mobile devices
- Scalable vector-based System 7 elements
- Adaptive layouts that maintain retro aesthetic
- Modern CSS Grid with System 7 visual styling
- Responsive typography using system-appropriate fonts

## Performance Considerations

- Efficient CSS rendering for retro effects
- Optimized image patterns for desktop backgrounds
- Hardware-accelerated animations
- Minimal JavaScript for drag functionality
- Efficient event handling for window management
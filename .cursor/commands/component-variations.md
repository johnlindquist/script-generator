# Component Variations Workflow

Create multiple visual variations of a component and organize them in a tab group for easy toggling.

## Workflow Steps

### 1. Identify Target Component

- Use Chrome DevTools MCP to find the CSS selector of the target component
- Locate the corresponding React component in the codebase
- Understand the current implementation and styling

### 2. Create Variations

Generate 3-4 distinct visual variations of the component by modifying:

- **Styling**: Different Tailwind CSS classes for colors, borders, shadows
- **Layout**: Varying sizes, padding, margins
- **Theme**: Light, dark, minimal, card-like appearances
- **Interactive states**: Different hover and focus effects

### 3. Implement Tab Group

- Create a `Tabs` UI component with proper state management
- Include `TabsList`, `TabsTrigger`, and `TabsContent` components
- Add React state to track active tab selection
- Ensure only the active tab's content is visible

### 4. Integration

- Wrap all variations in the tab structure
- Preserve existing functionality (event handlers, props, refs)
- Maintain accessibility and keyboard navigation
- Test tab switching functionality

### 5. Verification

- Use Chrome DevTools MCP to verify implementation
- Test each tab variation individually
- Ensure proper state management and visual feedback
- Verify no functionality is broken

## Example Variations

### Original

- Standard styling with shadows and rounded corners
- Default theme colors and spacing

### Minimal

- Dashed borders, transparent background
- Smaller size, subtle hover effects
- Clean, uncluttered appearance

### Dark

- Dark theme with gray background
- White text, accent colors for focus states
- Modern, sleek appearance

### Card

- Gradient backgrounds
- Card-like appearance with shadows
- Elevated design with smooth transitions

## Technical Requirements

- Use TypeScript with strict typing
- Follow React functional component patterns
- Implement proper state management
- Maintain accessibility standards
- Use Tailwind CSS for styling
- Follow project naming conventions

## Testing Checklist

- [ ] All tab variations render correctly
- [ ] Tab switching works smoothly
- [ ] Original functionality preserved
- [ ] No console errors
- [ ] Responsive design maintained
- [ ] Accessibility features intact

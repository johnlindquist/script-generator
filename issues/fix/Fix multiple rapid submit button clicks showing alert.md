---
title: Fix multiple rapid submit button clicks showing alert
type: note
permalink: fix/fix-multiple-rapid-submit-button-clicks-showing-alert
---

## Bug: Alert popup on rapid submit button clicks

When clicking the submit button five times too quickly, a pop-up window alert shows up.

### Context
- Extracted from daily note: 2025-07-16
- This appears to be an unintended behavior when the submit button is clicked rapidly

### Steps to Reproduce
1. Navigate to a form with a submit button
2. Click the submit button 5 times rapidly
3. An alert window pops up

### Expected Behavior
- The submit button should be disabled after the first click to prevent multiple submissions
- No alert should appear from rapid clicking

### Possible Solutions
- Add debouncing to the submit button
- Disable the button on first click until the submission is complete
- Add rate limiting on the client side

### Priority
High - This impacts user experience and could lead to duplicate submissions

### Related
- Source: [2025-07-16 Daily Note](memory://notes/2025-07-16)
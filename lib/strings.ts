export const STRINGS = {
  NAVBAR: {
    homeLinkLabel: 'Script Kit',
    addScript: '+ Add Script',
    signOut: 'Sign Out',
    signInToGenerate: 'Sign in to Generate',
    userAvatarAlt: 'User avatar',
  },

  FAVORITE_BUTTON: {
    tooltipRemove: 'Remove from favorites',
    tooltipAdd: 'Add to favorites',
    signInRequired: 'Please sign in to favorite scripts',
    error: 'Failed to favorite script',
  },

  VERIFY_BUTTON: {
    tooltipRemove: 'Remove verification',
    tooltipAdd: 'Verify script',
    signInRequired: 'Please sign in to verify scripts',
    error: 'Failed to verify script',
  },

  COPY_BUTTON: {
    tooltipCopied: 'Copied!',
    tooltipDefault: 'Copy to clipboard',
  },

  INSTALL_BUTTON: {
    tooltip: 'Install script',
    error: 'Failed to install script',
  },

  DELETE_BUTTON: {
    tooltipDelete: 'Delete script',
    tooltipConfirm: 'Confirm delete',
    tooltipCancel: 'Cancel',
    successMessage: 'Script deleted successfully',
    errorMessage: 'Unexpected error deleting script',
    errorMessageWithStatus: 'Failed to delete script (HTTP {status})',
  },

  EDIT_BUTTON: {
    tooltip: 'Edit script',
  },

  SCRIPT_CARD: {
    byAuthorDate: 'by {username} • {date}',
  },

  SIGN_IN_BUTTON: {
    label: 'sign in',
  },

  SCRIPT_GENERATION: {
    // Headings
    headingWhileGenerating: 'Generating Initial Script Idea',
    headingWhileRefining: 'Refining Script Idea',
    headingDone: 'Done ✅. Please Make Final Edits and Save',
    headingDefault: 'What Would You Like to Automate?',
    scriptSuggestionsHeading: 'Or click one of these suggestions',

    // Buttons
    generateScript: 'Generate',
    signInToGenerate: 'Sign in to Generate',
    dailyLimitReached: 'Daily Limit Reached',
    saveScript: 'Save Script',
    saveAndInstall: 'Save & Install',
    startOver: 'Start Over',
    generating: 'Generating...',

    // Form
    promptPlaceholderDefault:
      'Example: A script that finds all large files in a directory and shows their sizes in human-readable format',
    promptPlaceholderSignIn: 'Sign in to start generating scripts!',
    promptPlaceholderLimitReached: 'Daily generation limit reached. Try again tomorrow!',

    // Character count
    characterCount: '{count}/10,000 characters (minimum 15)',
    generationUsage: '{count} / {limit} generations used today',

    // Error messages
    errorHeading: 'Error',
  },
} as const

export const STRINGS = {
  NAVBAR: {
    homeLinkLabel: 'Script Kit',
    addScript: '+ Add Script',
    signOut: 'Sign Out',
    signInToGenerate: 'Sign in to Generate',
    userAvatarAlt: 'User avatar',
  },

  IMPORT_SCRIPTS: {
    title: 'Import Scripts from JSON',
    description:
      'The JSON should be an array of script objects. Each script should have a name and content. Optional fields include description, author (full name), user (username), github, and twitter.',
    inputLabel: 'Paste your JSON content here',
    importButton: 'Import Scripts',
    importing: 'Importing...',
    success: 'Successfully imported scripts',
    error: {
      invalidJson: 'Invalid JSON format. Expected an array of scripts.',
      unauthorized: 'Unauthorized',
      unknown: 'Failed to import scripts',
    },
  },

  SYNC_REPO: {
    title: 'Sync GitHub Repository',
    description:
      'Enter the full URL of the GitHub repository containing your scripts in the /scripts directory',
    inputLabel: 'GitHub Repository URL',
    inputPlaceholder: 'https://github.com/username/repository',
    syncButton: 'Sync Repository',
    syncing: 'Syncing...',
    success: 'Successfully imported scripts',
    error: {
      invalidUrl: 'Invalid GitHub repository URL',
      noScriptsDir: 'No scripts directory found in the repository',
      fetchFailed: 'Failed to fetch scripts from GitHub',
      unauthorized: 'Unauthorized',
      unknown: 'Failed to sync repository',
    },
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
    tooltipCopied: 'Copied to clipboard!',
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
    headingWhileGenerating: 'Generating Draft',
    headingWhileRefining: 'Generating Final Version',
    headingThinkingDraft: 'Thinking',
    headingThinkingFinal: 'Re-reading Docs and Finalizing',
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

    // Tooltips
    tooltipSignInToGenerate: 'Please sign in to generate scripts',
    tooltipSignInForLucky: "Please sign in to use I'm Feeling Lucky",

    // Form
    promptPlaceholderDefault:
      'Example: A script that finds all large files in a directory and shows their sizes in human-readable format',
    promptPlaceholderSignIn: 'Sign in to start generating scripts!',
    promptPlaceholderLimitReached: 'Daily generation limit reached. Try again tomorrow!',

    // Character count
    characterCount: '{count}/10,000 characters',
    generationUsage: '{count} / {limit} generations used today',

    // Error messages
    errorHeading: 'Error',
  },

  HOME: {
    prototype: {
      warning:
        "⚠️ This is a prototype - Don't expect scripts to work perfectly and backup your favorites!",
    },
    noScripts: 'No scripts found. Create one to get started!',
    pagination: {
      previous: 'Previous',
      next: 'Next',
      pageInfo: 'Page {currentPage} of {totalPages}',
    },
  },
} as const

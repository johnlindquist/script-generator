import { useEffect, useState } from "react";

const SUGGESTIONS = [
  "Clean up temporary files in a directory",
  "Convert CSV to JSON",
  "Resize all images in a folder",
  "Extract audio from a video",
  "Search for duplicated lines in a file",
  "Archive old log files",
  "Parse and validate JSON data",
  "Detect and remove unused npm packages",
  "Encrypt a file before uploading",
  "Check for broken symbolic links",
  "Generate a random password",
  "Compare two directories for differences",
  "Fetch and display latest weather info",
  "Generate an MD5 checksum of a file",
  "Merge multiple PDF files",
  "Notify when a service goes down using ping checks",
  "Convert all .wav files to .mp3",
  "Identify files larger than 100MB and list them",
  "Check for SSL certificate expiration on a list of domains",
  "Upload files from a local folder to an FTP server",
  "Extract all email addresses from multiple text files",
  "Show top 10 processes by memory usage",
  "Backup MongoDB collections to a timestamped archive",
  "Convert PNGs into a single animated GIF",
  "Create a zip file ignoring certain subdirectories",
  "Uninstall unused Node modules and reorder package.json",
  "Compare two JSON files and show differences",
  "Send a desktop notification when a process finishes",
  "Download all images from a specified URL",
  "Generate a random MAC address",
  "Create a daily \"last login\" report for each user",
  "Insert a custom license header into all .js files",
  "Batch-rename files using a RegEx pattern",
  "Split a CSV file into smaller chunks",
  "Automate AWS EC2 instance start/stop",
  "Calculate the total size of a directory tree",
  "Generate a color-coded disk usage map",
  "Clean invalid or broken Docker images",
  "Automatically kill processes hogging CPU over 90%",
  "Convert local Markdown files to HTML",
  "Schedule a script to run at specific intervals (cron)",
  "Create daily commits in Git for journaling",
  "Scan a folder for virus signatures",
  "Check if environment variables are set, else prompt user",
  "Automate file uploads to an SFTP server",
  "Extract EXIF data from all images in a directory",
  "Run a quick 'Hello World' server",
  "Generate random test data and populate a database",
  "List all network interfaces and their IP addresses",
  "Convert text files to uppercase",
  "Copy a directory structure without copying the files",
  "Test multiple ports to see if they are open",
  "Resize all images in a directory to a max dimension",
  "Create a local firewall rule to block a given IP",
  "Hash multiple files using SHA-256",
  "Generate a daily motivational quote from an API",
  "Convert .mov video to .mp4",
  "Backup a WordPress site including database",
  "Display battery health on a laptop",
  "Add line numbers to a text file",
  "Generate a Git ignore file based on project type",
  "Compare package.json with actual node_modules",
  "Move all files older than 30 days to an archive directory",
  "Automate software updates on Ubuntu",
  "Measure time taken by a script or command",
  "Count the frequency of each file extension in a folder",
  "Scan for malware signatures with ClamAV",
  "Check the last modified date of a list of URLs",
  "Toggle hidden files visibility in macOS Finder",
  "Build a local wiki from a directory of Markdown files",
  "Generate a daily progress log from a Trello board",
  "Automate environment setup (Node version, Python env, etc.)",
  "Move files to an external drive if disk usage is above threshold",
  "Encrypt all .txt files with GPG",
  "Show the git commit log in a formatted table",
  "Convert all .ts files to .js",
  "Send daily backup status to Slack",
  "Create a local Reverse Proxy for dev environment",
  "Extract domain names from a large list of URLs",
  "Remove trailing whitespace in all .md files",
  "Sync local MySQL database to remote",
  "Schedule a script to run only on weekdays",
  "Rename images to a consistent naming convention",
  "Measure bandwidth usage over a set time",
  "Count all console.log statements in a codebase",
  "Identify local ports currently in use and by which processes",
  "List all installed system fonts",
  "Retrieve and parse JSON from an API endpoint",
  "Sort a text file alphabetically (case-insensitive)",
  "Validate all .env files for missing keys",
  "Create a backup of your shell configuration files",
  "Display all running Docker containers with CPU usage",
  "Test concurrency by making multiple parallel HTTP requests",
  "Automatically compress older files to save space",
  "Display disk usage by subdirectory",
  "Authenticate with GitHub CLI and clone multiple repos",
  "Compile a PDF from multiple Markdown files",
  "Remove color escape codes from a text log",
  "Check a directory for potential license violations",
  "Scan codebase for TODO and FIXME comments",
  "Open firewall ports for a specified service",
  "Convert a directory of .svg icons to .png",
  "Check an RSS feed for new posts and notify",
  "Create a timelapse from a series of JPG files",
  "Automate DNS record updates for multiple domains",
  "Merge environment-specific config files",
  "Spellcheck all .md files in a repo",
  "Generate a daily \"commits summary\" across multiple repos",
  "Automate generating an SSL cert with Let's Encrypt",
  "Parse CSV data and perform quick calculations",
  "Find and remove empty directories",
  "Clean up orphaned Docker volumes",
  "Monitor temperature and fan speed on Linux",
  "Create a local user account with minimal privileges",
  "Check website uptime and log status codes regularly"
];

interface ScriptSuggestionsProps {
  setPrompt: (prompt: string) => void;
}

export default function ScriptSuggestions({ setPrompt }: ScriptSuggestionsProps) {
  const [randomSuggestions, setRandomSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const randomCount = Math.floor(Math.random() * 2) + 4; // 3 to 4 suggestions
    const shuffled = [...SUGGESTIONS]
      .sort(() => 0.5 - Math.random())
      .slice(0, randomCount);
    setRandomSuggestions(shuffled);
  }, []);

  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      {randomSuggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => setPrompt(suggestion)}
          className="text-sm bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full transition-colors duration-200"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
} 
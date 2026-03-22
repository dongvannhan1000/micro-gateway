#!/usr/bin/env node

/**
 * Micro-Security Gateway Setup Script
 * Cross-platform setup automation for Windows, Mac, and Linux
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Spinner frames for loading animation
const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;

/**
 * Print colored message to console
 */
function colorLog(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(60));
  colorLog(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

/**
 * Print success message with checkmark
 */
function printSuccess(message) {
  colorLog(`✓ ${message}`, 'green');
}

/**
 * Print error message with X
 */
function printError(message) {
  colorLog(`✗ ${message}`, 'red');
}

/**
 * Print warning message with warning symbol
 */
function printWarning(message) {
  colorLog(`⚠ ${message}`, 'yellow');
}

/**
 * Start spinner animation
 */
function startSpinner(message) {
  let frame = 0;
  process.stdout.write('\x1b[?25l'); // Hide cursor
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r${colors.cyan}${spinnerFrames[frame]} ${message}${colors.reset}`);
    frame = (frame + 1) % spinnerFrames.length;
  }, 80);
}

/**
 * Stop spinner animation
 */
function stopSpinner(success = true, message = '') {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  process.stdout.write('\x1b[?25h'); // Show cursor
  process.stdout.write('\r' + ' '.repeat(60) + '\r'); // Clear line
  if (message) {
    if (success) {
      printSuccess(message);
    } else {
      printError(message);
    }
  }
}

/**
 * Execute command and return output
 */
function execCommand(command, options = {}) {
  const { cwd = rootDir, silent = false, ignoreError = false } = options;

  try {
    if (!silent) {
      startSpinner(`Running: ${command}`);
    }
    const output = execSync(command, {
      cwd,
      stdio: silent ? 'pipe' : 'inherit',
      shell: true,
    });
    if (!silent) {
      stopSpinner(true);
    }
    return output?.toString().trim();
  } catch (error) {
    if (!silent) {
      stopSpinner(false, command);
    }
    if (!ignoreError) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
    return null;
  }
}

/**
 * Prompt user for input
 */
function prompt(question, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.cyan}? ${question}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer || defaultValue);
    });
  });
}

/**
 * Check if command exists
 */
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    try {
      execSync(`where ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generate encryption secret
 */
async function generateEncryptionSecret() {
  try {
    const secret = execSync('openssl rand -base64 32', { encoding: 'utf-8' }).trim();
    return secret;
  } catch (error) {
    // Fallback to Node.js crypto if openssl is not available
    const crypto = await import('crypto');
    return crypto.randomBytes(32).toString('base64');
  }
}

/**
 * Setup environment variables
 */
async function setupEnvironment() {
  printHeader('Step 1: Environment Configuration');

  const envPath = resolve(rootDir, '.dev.vars');
  const envExamplePath = resolve(rootDir, '.env.example');

  // Check if .dev.vars already exists
  if (existsSync(envPath)) {
    printWarning('.dev.vars already exists. Skipping environment setup.');
    printSuccess('Environment configuration: SKIPPED (already exists)');
    return true;
  }

  // Create .dev.vars from .env.example if it doesn't exist
  if (!existsSync(envExamplePath)) {
    printError('.env.example not found. Cannot create environment file.');
    return false;
  }

  let envContent = readFileSync(envExamplePath, 'utf-8');

  // Prompt for Supabase URL
  console.log('\n' + colors.dim + 'You can get your Supabase URL from: https://supabase.com/dashboard' + colors.reset);
  const supabaseUrl = await prompt('Enter your Supabase URL (or press Enter to skip)', '');

  // Generate encryption secret
  startSpinner('Generating encryption secret');
  const encryptionSecret = await generateEncryptionSecret();
  stopSpinner(true, 'Encryption secret generated');

  // Replace placeholders in env file
  envContent = envContent.replace(/SUPABASE_URL=.*/, `SUPABASE_URL=${supabaseUrl || 'https://your-project.supabase.co'}`);
  envContent = envContent.replace(/ENCRYPTION_SECRET=.*/, `ENCRYPTION_SECRET=${encryptionSecret}`);
  envContent = envContent.replace(/# Environment/, 'Environment');

  // Write .dev.vars
  writeFileSync(envPath, envContent);

  printSuccess('Environment configuration created (.dev.vars)');

  if (!supabaseUrl) {
    console.log('\n' + colors.yellow + '⚠ Note: You skipped Supabase URL configuration.' + colors.reset);
    console.log(colors.dim + '  To add it later, edit .dev.vars and set SUPABASE_URL' + colors.reset);
  }

  return true;
}

/**
 * Install dependencies
 */
function installDependencies() {
  printHeader('Step 2: Installing Dependencies');

  try {
    startSpinner('Installing npm dependencies (this may take a few minutes)');
    execCommand('npm install', { silent: true });
    stopSpinner(true, 'Dependencies installed successfully');
    return true;
  } catch (error) {
    stopSpinner(false, 'Failed to install dependencies');
    printError(error.message);
    return false;
  }
}

/**
 * Run database migrations
 */
function runDatabaseMigrations() {
  printHeader('Step 3: Database Migrations');

  try {
    startSpinner('Applying database migrations');
    execCommand('npm run migrate:local', { cwd: resolve(rootDir, 'packages/db'), silent: true });
    stopSpinner(true, 'Database migrations completed');
    return true;
  } catch (error) {
    stopSpinner(false, 'Database migrations failed');
    printWarning('You can run migrations manually later with: cd packages/db && npm run migrate:local');
    console.log(colors.dim + `  Error: ${error.message}` + colors.reset);
    return false;
  }
}

/**
 * Start development services
 */
function startServices() {
  printHeader('Step 4: Starting Services');

  console.log('\nStarting development services in background...');
  console.log(colors.dim + 'Gateway API:  http://localhost:8787' + colors.reset);
  console.log(colors.dim + 'Dashboard UI: http://localhost:3000' + colors.reset);
  console.log('\n' + colors.yellow + 'Press Ctrl+C to stop all services' + colors.reset + '\n');

  try {
    // Start both services using concurrently
    const child = spawn('npm', ['run', 'dev'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', (error) => {
      printError(`Failed to start services: ${error.message}`);
      process.exit(1);
    });

    child.on('exit', (code) => {
      console.log('\n' + colors.dim + `Services stopped with exit code: ${code}` + colors.reset);
      process.exit(code);
    });

  } catch (error) {
    printError(`Failed to start services: ${error.message}`);
    return false;
  }

  return true;
}

/**
 * Verify prerequisites
 */
function verifyPrerequisites() {
  printHeader('Verifying Prerequisites');

  const requiredCommands = ['node', 'npm'];
  const optionalCommands = ['openssl', 'wrangler'];

  let allRequiredFound = true;

  for (const cmd of requiredCommands) {
    if (commandExists(cmd)) {
      printSuccess(`${cmd} is installed`);
    } else {
      printError(`${cmd} is not installed`);
      allRequiredFound = false;
    }
  }

  for (const cmd of optionalCommands) {
    if (commandExists(cmd)) {
      printSuccess(`${cmd} is installed`);
    } else {
      printWarning(`${cmd} is not found (optional but recommended)`);
    }
  }

  if (!allRequiredFound) {
    console.log('\n' + colors.red + '✗ Missing required dependencies. Please install them and try again.' + colors.reset);
    console.log(colors.dim + '  Required: Node.js (v18+) and npm' + colors.reset);
    return false;
  }

  return true;
}

/**
 * Display success message
 */
function displaySuccessMessage() {
  printHeader('Setup Complete!');

  console.log(colors.green + colors.bright + '✓ Micro-Security Gateway is ready to use!' + colors.reset);
  console.log('\n' + colors.bright + 'Services:' + colors.reset);
  console.log(`  ${colors.cyan}Gateway API:${colors.reset}  http://localhost:8787`);
  console.log(`  ${colors.cyan}Dashboard UI:${colors.reset} http://localhost:3000`);

  console.log('\n' + colors.bright + 'Next Steps:' + colors.reset);
  console.log(`  1. Open your browser to ${colors.cyan}http://localhost:3000${colors.reset}`);
  console.log(`  2. Create your first API key in the dashboard`);
  console.log(`  3. Start making requests to the gateway!`);

  console.log('\n' + colors.bright + 'Documentation:' + colors.reset);
  console.log(`  See ${colors.cyan}CLAUDE.md${colors.reset} for detailed usage instructions`);
  console.log(`  See ${colors.cyan}docs/${colors.reset} for additional guides`);

  console.log('\n' + colors.dim + 'Press Ctrl+C to stop all services' + colors.reset + '\n');
}

/**
 * Main setup flow
 */
async function main() {
  console.clear();
  console.log(colors.cyan + colors.bright);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Micro-Security Gateway - Automated Setup             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Verify prerequisites
    if (!verifyPrerequisites()) {
      process.exit(1);
    }

    // Setup environment
    const envSetup = await setupEnvironment();
    if (!envSetup) {
      printWarning('Continuing with environment setup issues...');
    }

    // Install dependencies
    const depsInstalled = installDependencies();
    if (!depsInstalled) {
      printError('Failed to install dependencies. Cannot continue.');
      process.exit(1);
    }

    // Run database migrations
    const migrationsRun = runDatabaseMigrations();
    if (!migrationsRun) {
      printWarning('Continuing without database migrations...');
    }

    // Display success message
    displaySuccessMessage();

    // Start services
    startServices();

  } catch (error) {
    console.error('\n' + colors.red + colors.bright + '✗ Setup failed!' + colors.reset);
    console.error(colors.red + error.message + colors.reset);
    console.log('\n' + colors.dim + 'For help, please open an issue on GitHub' + colors.reset);
    process.exit(1);
  }
}

// Run the setup
main();

/**
 * Netlify Scheduled Function: Auto-post Telegram content
 * Triggers: 5 times daily at 9am, 12pm, 3pm, 6pm, 9pm UTC
 */

import { spawn } from 'child_process';

async function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const process = spawn('node', [scriptPath], {
      cwd: process.env.LAMBDA_TASK_ROOT,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(new Error(`Script failed with code ${code}\n${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

export default async () => {
  console.log(`[scheduled-post] Running at ${new Date().toISOString()}`);

  try {
    const result = await runScript('./scripts/post-telegram-content.mjs');
    console.log('[scheduled-post] Success:', result.stdout);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Post scheduled successfully',
        timestamp: new Date().toISOString(),
        output: result.stdout,
      }),
    };
  } catch (error) {
    console.error('[scheduled-post] Error:', error.message);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Post scheduling failed',
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
    };
  }
};

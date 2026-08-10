import time
import random
import subprocess
import os
import sys
from datetime import datetime, timedelta
import argparse

# Force stdout/stderr to use UTF-8 on Windows to avoid UnicodeEncodeError
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

# Interval between checks (8 hours = 28800 seconds)
CHECK_INTERVAL_SECS = 28800
MAX_JITTER_SECS = 2700  # 45 minutes max jitter

def run_crawler(test_mode=False):
    script_path = os.path.join(os.path.dirname(__file__), 'browser_worker.py')
    python_path = sys.executable  # Runs using the current virtual env's python
    
    print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Starting scheduled crawler run...")
    try:
        # Run browser_worker.py as a subprocess to keep memory clean
        cmd = [python_path, script_path]
        if test_mode:
            cmd.append('--test')
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Crawler output:\n{result.stdout}")
        if result.stderr:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Crawler errors:\n{result.stderr}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Failed to execute crawler: {e}")

def main():
    parser = argparse.ArgumentParser(description="Scheduled runner for the Launchpad crawler")
    parser.add_argument("--test", action="store_true", help="Run in test mode with short intervals and mock runs")
    args = parser.parse_args()

    global CHECK_INTERVAL_SECS, MAX_JITTER_SECS
    if args.test:
        CHECK_INTERVAL_SECS = 5
        MAX_JITTER_SECS = 3
        print("--- RUNNING IN TEST MODE ---")
        print("Interval reduced to 5s, Jitter reduced to 3s. Executing browser_worker.py in --test mode.")

    print("==========================================")
    print("LAUNCHPAD SCHEDULER STARTED")
    print(f"Frequency: Every {CHECK_INTERVAL_SECS} seconds (Test Mode)" if args.test else f"Frequency: Every {CHECK_INTERVAL_SECS // 3600} hours (3 times a day)")
    print(f"Max Bot-Evasion Jitter: {MAX_JITTER_SECS} seconds" if args.test else f"Max Bot-Evasion Jitter: {MAX_JITTER_SECS // 60} minutes")
    print(f"Python Executable: {sys.executable}")
    print("==========================================")
    
    # Run once immediately on startup to verify setup
    run_crawler(test_mode=args.test)
    
    iterations = 0
    while True:
        next_run = datetime.now() + timedelta(seconds=CHECK_INTERVAL_SECS)
        print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Next run scheduled for approx: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Sleep for the interval
        time.sleep(CHECK_INTERVAL_SECS)
        
        # Calculate random jitter
        jitter = random.randint(0, MAX_JITTER_SECS)
        jitter_minutes = jitter // 60
        jitter_seconds = jitter % 60
        
        if args.test:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Scheduler triggered. Applying bot-evasion jitter delay: {jitter}s...")
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Scheduler triggered. Applying bot-evasion jitter delay: {jitter_minutes}m {jitter_seconds}s...")
        time.sleep(jitter)
        
        # Execute crawler
        run_crawler(test_mode=args.test)

        if args.test:
            iterations += 1
            if iterations >= 1:
                print("\nScheduler test run completed successfully. Exiting.")
                break

if __name__ == "__main__":
    main()

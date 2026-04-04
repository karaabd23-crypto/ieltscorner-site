import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
import os

LESSON_FILE = os.path.join(os.path.dirname(__file__), 'lesson_summaries.txt')
POSTS_PER_DAY = 5
SECONDS_BETWEEN_POSTS = 60 * 60 * 24 // POSTS_PER_DAY  # Evenly spaced in 24h

# User must scan QR code on first run
WHATSAPP_WEB = 'https://web.whatsapp.com/'
CHANNEL_NAME = 'CELPIP Free Resources'  # <-- CHANGE THIS


def get_messages():
    with open(LESSON_FILE, encoding='utf-8') as f:
        content = f.read()
    return [msg.strip() for msg in content.split('---') if msg.strip()]

def post_to_whatsapp(messages):
    driver = webdriver.Chrome()
    driver.get(WHATSAPP_WEB)
    input("Scan QR code and press Enter to continue...")
    time.sleep(5)
    search_box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="3"]')
    search_box.click()
    search_box.send_keys(CHANNEL_NAME)
    time.sleep(2)
    search_box.send_keys(Keys.ENTER)
    time.sleep(2)
    for i, msg in enumerate(messages):
        print(f"Posting message {i+1}/{len(messages)}")
        msg_box = driver.find_element(By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]')
        msg_box.click()
        msg_box.send_keys(msg)
        msg_box.send_keys(Keys.SHIFT, Keys.ENTER)  # Newline for separation
        msg_box.send_keys(Keys.ENTER)
        if i < len(messages) - 1:
            print(f"Waiting {SECONDS_BETWEEN_POSTS} seconds before next post...")
            time.sleep(SECONDS_BETWEEN_POSTS)
    print("All messages posted.")
    driver.quit()

if __name__ == '__main__':
    msgs = get_messages()
    post_to_whatsapp(msgs)

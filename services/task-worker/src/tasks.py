from celery import Celery
from redis import Redis
import json
import logging as logger
import socketio

# Define the Celery application
app = Celery('tasks', broker='redis://redis:6379/0')

# Define a Celery task
@app.task
def process_message(message):
    # Process the message (example: increment the message)
    incremented_message = message + 1

    # Publish the incremented message back to a Redis channel
    redis_client = Redis(host='redis', port=6379, db=0)
    redis_client.publish('incremented_messages', incremented_message)

if __name__ == "__main__":
    # Connect to Redis
    redis_client = Redis(host='redis', port=6379, db=0)

    # Subscribe to the 'chat_messages' channel
    pubsub = redis_client.pubsub()
    pubsub.subscribe('chat_messages')

    # Listen for messages and process them using the Celery task
    for message in pubsub.listen():
        logger.info('Received message: %s', message)

        # if message['type'] == 'message':
        #     # Parse the message (assuming it's JSON)
        #     parsed_message = json.loads(message['data'])

        #     # Extract the message content
        #     content = parsed_message.get('message')

        #     # Process the message using the Celery task
        #     process_message.delay(content)

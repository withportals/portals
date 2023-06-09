import { env } from './utils/envsafe';
import {
  getSSLHubRpcClient,
  HubEvent,
  HubEventType,
  HubRpcClient,
} from '@farcaster/hub-nodejs';
import { sendToSQS } from './helpers/sendToSQS';

(async () => {
  console.log(env.HUB_RPC_URL);

  const client: HubRpcClient = getSSLHubRpcClient(env.HUB_RPC_URL);
  const subResult = await client.subscribe({
    eventTypes: [
      HubEventType.MERGE_ID_REGISTRY_EVENT,
      HubEventType.MERGE_NAME_REGISTRY_EVENT,
      HubEventType.MERGE_MESSAGE,
      HubEventType.PRUNE_MESSAGE,
      HubEventType.REVOKE_MESSAGE,
    ],
  });

  if (subResult.isOk()) {
    const stream = subResult.value;

    for await (const anyEvent of stream) {
      const event = anyEvent as HubEvent;

      sendToSQS(event)
        .then((response) => {
          console.log(
            `Successfully sent FC Hub Message with ID ${event.id} to SQS: ${response.MessageId}`
          );
        })
        .catch((e) => {
          console.error(`Failed to send message to the SQS Queue: ${e}`);
        });
    }
  } else {
    throw new Error('Client failed to subscribe to stream');
  }
})();

export {};

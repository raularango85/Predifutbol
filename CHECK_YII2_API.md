# Yii2 API External Match Integration - Audit & Check Plan

## 1. Locate and Inspect API Endpoints & Controllers
* **Path to check:** `controllers/` or `modules/api/controllers/`
* **Action:** Look for controllers responsible for fetching or syncing match data (e.g., `MatchController.php`, `SyncController.php`, or `ExternalApiController.php`).
* **What to verify:**
  * Are endpoints returning JSON correctly (`\Yii::$app->response->format = Response::FORMAT_JSON;`)?
  * Are authentication headers or API keys (Bearer tokens / headers) configured for the external service?

## 2. Inspect External Service Integration / Clients
* **Path to check:** `components/`, `services/`, or `models/`
* **Action:** Search for HTTP client implementations used to communicate with the external match provider (e.g., Guzzle HTTP client, Yii's built-in `yii\httpclient\Client`, or native `curl`).
* **Code pattern to look for:**
  ```php
  use yii\httpclient\Client;

  $client = new Client(['baseUrl' => '[https://api.external-sports-provider.com/v1](https://api.external-sports-provider.com/v1)']);
  $response =$client->createRequest()
      ->setMethod('GET')
      ->setUrl('matches')
      ->setHeader('X-Auth-Token', $params['externalApiKey'])
      ->send();
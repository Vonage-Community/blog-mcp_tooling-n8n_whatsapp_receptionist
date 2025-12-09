# AI WhatsApp Receptionist for n8n (with Vonage MCP)

This repo contains everything you need to quickly spin up the AI WhatsApp receptionist described in the blog post:

- Vonage MCP HTTP bridge (separate repo, linked below)  
- Ready‑to‑import n8n workflow JSON  
- Full system prompt and Function node script

For a full, step‑by‑step walkthrough (including screenshots and explanation), see the blog post:  
**[Build a 5‑Node AI WhatsApp Receptionist for Your Airbnb with n8n and Vonage MCP Tools](https://YOUR-BLOG-URL-HERE)**

This README focuses on the **quickstart** path so you can get the demo running in a few minutes.

---

## 1. Prerequisites

You’ll need:

- **n8n**  
  - n8n Cloud or self‑hosted instance.
  - MCP access **enabled** in `Settings → MCP Access`.

- **Vonage account**  
  - API key + secret.
  - A **Vonage Application** with:
    - **Messages** capability (WhatsApp enabled and linked).
    - **Voice** capability.
  - At least one WhatsApp‑enabled number.

- **OpenAI (or other model provider)**  
  - This workflow is configured for `gpt-4.1-mini` via the `OpenAI Chat Model` node.
  - You can swap to another provider if you prefer.

- **Google account**  
  - Access to Google Sheets and the ability to create a copy of the example sheet.

- **Vonage MCP Bridge deployed to Render**  
  - From the separate repo:  
    https://github.com/ruskibenya/vonage-mcp-http-bridge  
  - Use the “Deploy to Render” button or [render.yaml](cci:7://file:///Users/baronov/code/ruskibenya/vonage-mcp-http-bridge/render.yaml:0:0-0:0) blueprint there.

---

## 2. Import the workflow into n8n

1. Download [workflows/ai-whatsapp-receptionist.json](cci:7://file:///Users/baronov/code/ruskibenya/vonage-mcp-http-bridge-github/workflows/ai-whatsapp-receptionist.json:0:0-0:0) from this repo.
2. In n8n, go to **Workflows → Import**.
3. Choose **Import from file** and select the JSON file.
4. Save the workflow and give it a name (e.g. `AI WhatsApp Receptionist`).
5. Make sure the workflow is **inactive** while you configure credentials and URLs.

---

## 3. Configure the workflow for your setup

Work through these sub‑steps in order.

### 3a. Create and connect your Vonage Application

1. In the Vonage dashboard, create a new **Application** (or reuse an existing one):
   - Enable **Messages**.
   - Enable **Voice**.
   - For Messages webhooks, set temporary placeholders for now (you’ll replace inbound later).
2. Link your **WhatsApp Business Account (WABA)** to this application.
3. Note down:
   - **API key** and **API secret**
   - **Application ID**
   - **Private key** (downloaded `.key` file; you’ll base64‑encode it for the MCP bridge).
   - Your **WhatsApp number**.

4. In n8n:
   - Open the imported workflow.
   - Select the **Inbound Message** webhook node.
   - Activate the workflow to get a **Production Webhook URL**.
5. Back in Vonage:
   - Set the **Inbound** webhook URL for your Messages application to this n8n webhook URL.
   - Method: **POST**.

At this point, sending a WhatsApp message to your Vonage number should trigger the n8n workflow (you’ll see executions in n8n).

---

### 3b. Copy the Google Sheets and wire up the nodes

1. Open the example Google Sheet used in the blog (or create your own equivalent with:
   - A **Properties** sheet (WiFi, check‑in/out, rules, etc.).
   - A **Guests** sheet (guest_number, history, last_seen_at, last_issue, last_severity).
2. Make your own copy in Google Drive:
   - `File → Make a copy`.

3. Back in n8n, update every Google Sheets node:

- **`get_property_info`** (Google Sheets Tool)
  - Set **Document** to your copy.
  - Set **Sheet** to the `Properties` tab.
- **`get_guest_info`** (Google Sheets)
  - Set **Document** to your copy.
  - Set **Sheet** to the `Guests` tab.
  - Confirm the filter uses `guest_number` and `={{ $json.body.from }}`.
- **`save_guest_history`** (Google Sheets)
  - Same document and `Guests` sheet.
  - Ensure the column mappings match your sheet headers.

Make sure all Sheets nodes use **your** Google Sheets credential.

---

### 3c. Add OpenAI (or other model) credentials

1. In n8n, open the **OpenAI Chat Model** node.
2. Select or create an **OpenAI credential**:
   - Add your **OpenAI API key**.
3. Confirm the model is set to `gpt-4.1-mini` (or change it to another supported model if you prefer).
4. Test the node if your n8n version allows it.

---

### 3d. Deploy the Render MCP bridge and update the MCP Client node

The AI Agent talks to Vonage tools via the MCP bridge.

1. Follow the quickstart in the bridge repo:  
   https://github.com/ruskibenya/vonage-mcp-http-bridge
   - Deploy to Render with the provided blueprint.
   - Set all required env vars (`MCP_AUTH_TOKEN`, `VONAGE_*`).
   - Confirm `/mcp` works with the JSON‑RPC `tools/list` curl test.

2. In n8n, open the **Vonage MCP Client** node:
   - **Server Transport**: `HTTP Streamable` (or `HTTP` depending on your n8n version).
   - **MCP Endpoint URL**:  
     `https://YOUR-RENDER-APP.onrender.com/mcp`
   - **Authentication**: `Bearer Auth`.
   - Select the Bearer credential whose token equals your `MCP_AUTH_TOKEN` on Render.

3. Test the MCP Client node:
   - Use “By ID” and pick a simple tool like `balance`.
   - If the test succeeds, the Agent will be able to use WhatsApp/SMS/voice tools.

---

### 3e. Hardcode the host number in the prompt (after testing)

In the first version of the workflow, the **host number** is temporarily set to the same value as the guest number for convenience. Once you’ve verified everything works end‑to‑end:

1. Open the **AI Agent** node.
2. In the **User Prompt** text, find the `Host number` line:
3. Replace it with your real host number in E.164 format:
   ```text
   Host number: {{ $('Inbound Message').item.json.body.from }}  <!-- or a fixed host number later -->
   ```*
4. Save the workflow.
  From now on:
    - The guest’s WhatsApp/SMS messages go to the guest number.
    - Medium/high severity issues are escalated to your host number via SMS and/or outbound voice calls.

---
## Supporting files in this repo

- **[workflows/ai-whatsapp-receptionist.json](cci:7://file:///Users/baronov/code/ruskibenya/vonage-mcp-http-bridge-github/workflows/ai-whatsapp-receptionist.json:0:0-0:0)**  
  Import this into n8n for the full workflow.

- **[prompts/receptionist-system-prompt.md](cci:7://file:///Users/baronov/code/ruskibenya/vonage-mcp-http-bridge-github/prompts/receptionist-system-prompt.md:0:0-0:0)**  
  Full system prompt used in the AI Agent node.

- **[prompts/function-node-script.js](cci:7://file:///Users/baronov/code/ruskibenya/vonage-mcp-http-bridge-github/prompts/function-node-script.js:0:0-0:0)**  
  Code used in the Function/Code node to:
  - Strip `LAST_ISSUE` / `LAST_SEVERITY` tags.  
  - Append to guest `history`.  
  - Update `last_seen_at`, `last_issue`, `last_severity`.

These files are mainly for reference and customization; the imported workflow already contains their contents.
---
## Summary

With:

- This repo (workflow + prompts),
- The Vonage MCP bridge deployed to Render, and
- Your own Vonage, OpenAI, and Google credentials,

you can get a working AI WhatsApp receptionist running in n8n in just a few steps. For deeper understanding, variations, and screenshots, refer back to the full blog post; for quick reuse, follow the quickstart above and swap in your own numbers, sheets, and API keys.


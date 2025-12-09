// 1. Get the full agent output text
const fullOutput = $input.first().json.output ?? '';

// 2. Extract structured tags with regex
let lastIssue = '';
let lastSeverity = 'low'; // default

const issueMatch = fullOutput.match(/LAST_ISSUE:\s*"([^"]*)"/i);
if (issueMatch) {
  lastIssue = issueMatch[1];
}

const severityMatch = fullOutput.match(/LAST_SEVERITY:\s*"([^"]*)"/i);
if (severityMatch) {
  lastSeverity = severityMatch[1].toLowerCase();
}

// 3. Visible reply text for the guest (strip tag lines)
const agentReply = fullOutput
  .split('\n')
  .filter(
    (line) =>
      !line.trim().startsWith('LAST_ISSUE:') &&
      !line.trim().startsWith('LAST_SEVERITY:')
  )
  .join('\n')
  .trim();

// 4. Get inputs from previous nodes
// Inbound Message node payload
const inbound = $('Inbound Message').first().json.body;

// Guest number & message from Vonage webhook
const guestNumber = inbound.from;
const guestMessage = inbound.text;

// Previous history from Sheets (if any)
const prevHistory =
  $('get_guest_info').first().json.history ?? '';

// 5. Build updated history
const now = new Date().toISOString();

const newEntry =
  `[${now}] Guest (${guestNumber}): ${guestMessage}\n` +
  `[${now}] Agent: ${agentReply}\n\n`;

const history = prevHistory + newEntry;

// 6. Return updated record
return [
  {
    ...JSON,          // keep whatever the Agent node passed through
    agent_reply: agentReply,
    history,
    last_seen_at: now,
    last_issue: lastIssue,
    last_severity: lastSeverity,
  },
];
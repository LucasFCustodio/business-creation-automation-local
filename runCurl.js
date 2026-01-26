import { exec } from 'child_process';

const command = `curl -i https://api.pipefy.com/graphql \
  -H "Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJQaXBlZnkiLCJpYXQiOjE3Njk0MzQ1NDgsImp0aSI6Ijk5YTNiNTA0LWFmZmEtNDc5OS1iZDczLTgxYmY5NWRiNTE3MCIsInN1YiI6MzA3NDE2NzcwLCJ1c2VyX3R5cGUiOiJhdXRoZW50aWNhdGVkIn0.UUb8I1w6jHaXM2qYXsyvSbM2bURtsQIpvQZkeIK71WAp_jMB-POZatIopbyjxvaiy-Nvm4uFJj5wT-9kKrgoNA" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data '{"query":"mutation { moveCardToPhase(input: { card_id: 1287993879, destination_phase_id: 338150068 }) { card { current_phase { id } } } }"}'`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('exec error:', error);
    return;
  }

  if (stderr) {
    console.error('stderr:', stderr);
    return;
  }

  try {
    const data = JSON.parse(stdout);
    console.log('New phase ID:', data.data.moveCardToPhase.card.current_phase.id);
  } catch (e) {
    console.error('Failed to parse JSON:', stdout);
  }
});
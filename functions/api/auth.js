// Cloudflare Pages OAuth handler
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const code = searchParams.get('code');

  const GITHUB_CLIENT_ID = context.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = context.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    // Step 1: redirect to GitHub OAuth
    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo,user',
      redirect_uri: `https://southlandequity-site.pages.dev/api/auth`,
    });
    return Response.redirect(
      `https://github.com/login/oauth/authorize?${params}`,
      302
    );
  }

  // Step 2: exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    return new Response(`OAuth error: ${tokenData.error_description}`, { status: 400 });
  }

  const token = tokenData.access_token;
  const provider = 'github';

  // Return script that posts token back to the CMS opener window
  const script = `
<!doctype html>
<html>
<head><title>Authenticating...</title></head>
<body>
<script>
  (function() {
    function receiveMessage(e) {
      console.log('receiveMessage %o', e);
      window.opener.postMessage(
        'authorization:${provider}:success:${JSON.stringify({ token, provider })}',
        e.origin
      );
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:${provider}', '*');
  })();
<\/script>
</body>
</html>`;

  return new Response(script, {
    headers: { 'Content-Type': 'text/html' },
  });
}

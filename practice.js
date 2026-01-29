fetch('https://hook.us2.make.com/u3ejdjhxrmtw44p0yvlq48pp3s9yhav0')
.then(response => {
    // Check if the request was successful (status in the 200-299 range)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Parse the response body as JSON
    return response.json();
  });
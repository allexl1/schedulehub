export default async function handler(req, res) {
  // Allow cross-origin requests from your frontend Mini App
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { group = '150501' } = req.query;

  try {
    const bsuirResponse = await fetch(`https://iis.bsuir.by/api/v1/schedule?studentGroup=${group}`);
    
    if (!bsuirResponse.ok) {
      return res.status(503).json({ 
        success: false, 
        error: 'BSUIR API returned an error', 
        isStale: true 
      });
    }

    const scheduleData = await bsuirResponse.json();
    return res.status(200).json({ 
      success: true, 
      data: scheduleData,
      fetchedAt: new Date().toISOString() 
    });

  } catch (error) {
    return res.status(500).json({ 
      success: false, 
      error: error.message, 
      isStale: true 
    });
  }
}

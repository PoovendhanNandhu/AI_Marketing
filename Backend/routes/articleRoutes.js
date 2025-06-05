const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Structure Instructions Map for articles
const structureInstructionsMap = {
  default: `
Use headings (e.g., "##" for major sections) and leave a blank line between paragraphs.
Follow a standard format:
1. An engaging introduction
2. Well-organized main points
3. Supporting details and examples
4. A strong conclusion
`,
  newspaper: `
Please write this article in a newspaper style, using an inverted pyramid approach:
1. A clear headline (## Headline)
2. A lead paragraph summarizing the most crucial information
3. Body paragraphs providing supporting details and quotes
4. A concluding paragraph that ties the story together
Use a blank line between paragraphs.
`,
  blog: `
Please write this article as a blog post:
1. A catchy title (## Title)
2. An introduction that hooks the reader
3. Subheadings for each main point
4. A concluding paragraph or call-to-action
Leave a blank line between paragraphs.
`,
  editorial: `
Please write this article in an editorial style:
1. A compelling headline (## Headline)
2. A clear statement of opinion or stance in the introduction
3. Body paragraphs with arguments, evidence, and counterarguments
4. A concluding paragraph reinforcing the editorial stance
Leave a blank line between paragraphs.
`,
  scientific: `
Please write this article in a scientific paper style:
1. Title (## Title)
2. Abstract or summary
3. Introduction with background and purpose
4. Methodology or approach
5. Results or main findings
6. Discussion or analysis
7. Conclusion
Leave a blank line between paragraphs.
`
};

router.post('/chat', async (req, res) => {
  try {
    const { topic, style, audience, tone, length, keywords, structure } = req.body;

    // Retrieve specific instructions based on selected structure or default.
    const instructions = structureInstructionsMap[structure] || structureInstructionsMap.default;

    // Build the article prompt.
    const articlePrompt = `
Write a ${style || 'informative'} article about "${topic}".
Target audience: ${audience || 'general'}
Tone: ${tone || 'professional'}
Length: ${length || 'medium'}
${keywords ? `Include these keywords naturally: ${keywords}` : ''}

${instructions}

Ensure the content is:
- Appropriate for the target audience
- Maintains the specified tone throughout
- Follows the requested length
${keywords ? '- Naturally incorporates the provided keywords' : ''}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional article writer who creates well-structured, engaging content tailored to specific audiences and requirements."
        },
        {
          role: "user",
          content: articlePrompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;

    res.json({
      response: responseText,
      metadata: {
        topic,
        style,
        audience,
        tone,
        length,
        keywords,
        structure,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error processing article request:', error);
    res.status(500).json({
      error: 'An error occurred while generating your article',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

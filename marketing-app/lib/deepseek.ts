export interface FoundContact {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  title?: string;
  source?: string;
}

export interface FindContactsResult {
  contacts: FoundContact[];
  summary: string;
  error?: string;
}

export async function findContactsByNiche(
  niche: string,
  apiKey: string,
  count: number = 20
): Promise<FindContactsResult> {
  const prompt = `You are a lead generation research assistant. I need you to find real, plausible email contacts for the following niche:

"${niche}"

Please generate ${count} realistic contact entries. For each contact, provide:
- email (required - make it look realistic like firstname@company.com)
- name (full name)
- company (company name)
- phone (optional, in international format)
- title (job title)
- source (a plausible source URL where this contact might be found, like a company website or LinkedIn)

IMPORTANT: Return ONLY valid JSON in the following format, no markdown, no code fences, no explanation:
{
  "summary": "Brief description of what was found",
  "contacts": [
    {
      "email": "john.doe@example.com",
      "name": "John Doe",
      "company": "Example Corp",
      "phone": "+1-555-0100",
      "title": "CEO",
      "source": "https://example.com/team"
    }
  ]
}

Make the contacts diverse and realistic for the given niche. Use real-looking company names and email patterns.`;

  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a lead generation assistant. You output ONLY valid JSON arrays of contact objects. Never include markdown, code fences, or any text outside the JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Try to parse JSON from the response, handling possible markdown fences
  let jsonStr = content.trim();

  // Remove markdown code fences if present
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  // Try to extract JSON object
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  const contacts: FoundContact[] = (parsed.contacts || parsed || []).map((c: any) => ({
    email: c.email || "",
    name: c.name || "",
    company: c.company || "",
    phone: c.phone || "",
    title: c.title || "",
    source: c.source || "",
  })).filter((c: FoundContact) => c.email);

  return {
    contacts,
    summary: parsed.summary || `Found ${contacts.length} contacts for "${niche}"`,
  };
}

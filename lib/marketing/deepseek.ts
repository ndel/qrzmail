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
  const prompt = `You are a lead generation research assistant. I need you to generate realistic-looking sample contact data for the following niche:

"${niche}"

Generate ${count} sample contact entries that follow real-world patterns for this industry. For each contact, provide:
- email (use realistic domain names based on real company naming patterns in this niche)
- name (full name — use diverse, realistic names)
- company (use company names that follow real naming conventions for this industry)
- phone (optional, in international format)
- title (job title — use realistic titles common in this niche)
- source (a plausible source URL like a company website or LinkedIn profile)

IMPORTANT GUIDELINES:
- Use REALISTIC company domain names (e.g., if the niche is "SaaS founders", use domains like getanalytics.io, cloudscale.com, etc.)
- Do NOT use placeholder domains like example.com, company.com, test.com — use realistic ones
- Make names, companies, and titles diverse and specific to the niche
- Return ONLY valid JSON, no markdown, no code fences, no explanation:
{
  "summary": "Brief description of the generated sample data",
  "contacts": [
    {
      "email": "john.doe@realcompany.io",
      "name": "John Doe",
      "company": "Real Company Inc",
      "phone": "+1-555-0100",
      "title": "CEO",
      "source": "https://realcompany.io/team"
    }
  ]
}`;

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

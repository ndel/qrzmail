import db from "./db";

export interface SegmentRule {
  field: string;
  operator: "equals" | "contains" | "not_equals" | "before" | "after";
  value: string;
}

export function evaluateSegment(listId: string, rules: SegmentRule[]): string[] {
  const contacts = db.prepare("SELECT * FROM marketing_contacts WHERE list_id = ?").all(listId) as any[];
  return contacts.filter((c) => rules.every((r) => matchesRule(c, r))).map((c) => c.id);
}

function matchesRule(contact: any, rule: SegmentRule): boolean {
  let fieldValue: string;
  if (rule.field.startsWith("custom.")) {
    const customKey = rule.field.slice(7);
    const customFields = JSON.parse(contact.custom_fields || "{}");
    fieldValue = String(customFields[customKey] || "");
  } else {
    fieldValue = String(contact[rule.field] || "");
  }
  switch (rule.operator) {
    case "equals": return fieldValue.toLowerCase() === rule.value.toLowerCase();
    case "not_equals": return fieldValue.toLowerCase() !== rule.value.toLowerCase();
    case "contains": return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
    case "before": return fieldValue < rule.value;
    case "after": return fieldValue > rule.value;
    default: return false;
  }
}

export function getSuggestedSegments(listId: string): Array<{ name: string; rules: SegmentRule[]; count: number }> {
  const contacts = db.prepare("SELECT * FROM marketing_contacts WHERE list_id = ?").all(listId) as any[];
  const suggestions: Array<{ name: string; rules: SegmentRule[]; count: number }> = [];

  const active = contacts.filter((c) => c.status === "active");
  suggestions.push({ name: "Active Subscribers", rules: [{ field: "status", operator: "equals", value: "active" }], count: active.length });

  const unsubscribed = contacts.filter((c) => c.status === "unsubscribed");
  suggestions.push({ name: "Unsubscribed", rules: [{ field: "status", operator: "equals", value: "unsubscribed" }], count: unsubscribed.length });

  const bounced = contacts.filter((c) => c.status === "bounced");
  suggestions.push({ name: "Bounced Emails", rules: [{ field: "status", operator: "equals", value: "bounced" }], count: bounced.length });

  const withCompany = contacts.filter((c) => c.company && c.company.trim());
  suggestions.push({ name: "Has Company Name", rules: [{ field: "company", operator: "not_equals", value: "" }], count: withCompany.length });

  return suggestions;
}

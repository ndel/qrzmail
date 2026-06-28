declare module "mailparser" {
  import { Stream } from "stream";

  interface ParsedMail {
    from?: { text: string; html?: string; value?: Array<{ address: string; name: string }> };
    to?: { text: string; html?: string; value?: Array<{ address: string; name: string }> };
    subject?: string;
    messageId?: string;
    inReplyTo?: string;
    references?: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename?: string;
      contentType?: string;
      content: Buffer;
    }>;
    headers?: Map<string, string>;
  }

  export function simpleParser(
    source: Buffer | string | Stream,
    options?: any
  ): Promise<ParsedMail>;
}

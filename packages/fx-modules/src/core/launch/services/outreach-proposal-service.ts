/**
 * OutreachProposalService — Offering Pack 기반 맞춤 제안서 생성 (F299)
 */
import { GtmCustomerService } from "./gtm-customer-service.js";
import { GtmOutreachService } from "./gtm-outreach-service.js";
import { OfferingPackService } from "./offering-pack-service.js";

export class OutreachProposalService {
  private customerSvc: GtmCustomerService;
  private outreachSvc: GtmOutreachService;
  private packSvc: OfferingPackService;

  constructor(private db: D1Database, private ai?: Ai) {
    this.customerSvc = new GtmCustomerService(db);
    this.outreachSvc = new GtmOutreachService(db);
    this.packSvc = new OfferingPackService(db);
  }

  async generate(outreachId: string, orgId: string): Promise<string> {
    const outreach = await this.outreachSvc.getById(outreachId, orgId);
    if (!outreach) throw new Error("Outreach not found");

    const customer = await this.customerSvc.getById(outreach.customerId, orgId);
    if (!customer) throw new Error("Customer not found");

    if (!outreach.offeringPackId) {
      throw new Error("No offering pack linked — cannot generate proposal");
    }

    const pack = await this.packSvc.getById(outreach.offeringPackId, orgId);
    if (!pack) throw new Error("Offering pack not found");

    const packAny = pack as unknown as { title: string; items?: Array<{ title: string; content?: string }> };
    const items = packAny.items ?? [];
    const itemSummary = items.length > 0
      ? items.map((i) => `- ${i.title}: ${(i.content ?? "").slice(0, 200)}`).join("\n")
      : "No items available";

    const prompt = buildPrompt(customer, packAny, itemSummary);

    let content: string;
    try {
      if (this.ai) {
        const result = await (this.ai as Ai).run("@cf/meta/llama-3.1-8b-instruct" as Parameters<Ai["run"]>[0], {
          messages: [
            { role: "system", content: "You are a professional business proposal writer. Write in Korean." },
            { role: "user", content: prompt },
          ],
          max_tokens: 2000,
        });
        content = typeof result === "string"
          ? result
          : (result as { response?: string }).response ?? extractiveFallback(packAny, itemSummary, customer);
      } else {
        content = extractiveFallback(packAny, itemSummary, customer);
      }
    } catch {
      content = extractiveFallback(packAny, itemSummary, customer);
    }

    await this.outreachSvc.updateProposal(outreachId, orgId, content);
    return content;
  }
}

function buildPrompt(
  customer: { companyName: string; industry: string | null; companySize: string | null; contactRole: string | null },
  pack: { title: string },
  itemSummary: string,
): string {
  return `다음 고객에 맞춤 제안서를 작성해 주세요.

## 고객 정보
- 회사: ${customer.companyName}
- 업종: ${customer.industry ?? "미지정"}
- 규모: ${customer.companySize ?? "미지정"}
- 담당자 직책: ${customer.contactRole ?? "미지정"}

## Offering Pack: ${pack.title}
${itemSummary}

## 요구사항
1. 고객 업종과 규모에 맞는 어투와 사례 활용
2. Offering Pack 항목을 고객 맞춤으로 재구성
3. 핵심 가치 제안을 명확히 전달
4. 다음 단계(미팅 등) 제안으로 마무리
5. Markdown 형식, 2000자 이내`;
}

function extractiveFallback(
  pack: { title: string },
  itemSummary: string,
  customer: { companyName: string; industry: string | null },
): string {
  return `# ${customer.companyName} 맞춤 제안서

## Offering: ${pack.title}

${customer.industry ? `**${customer.industry}** 업종에 최적화된 제안입니다.\n` : ""}
### 주요 제공 항목

${itemSummary}

---

*본 제안서는 귀사의 비즈니스 성장을 위해 작성되었습니다. 상세 논의를 위한 미팅을 제안드립니다.*`;
}

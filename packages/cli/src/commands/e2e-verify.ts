// F526: foundry-x e2e-verify <sprintNum> [--gap-rate <N>]
// Sprint autopilot Step 5~6용 E2E Verify 파이프라인 CLI 진입점

import { Command } from 'commander';
import path from 'node:path';
import { runE2EVerify } from '../services/e2e-runner.js';

export function e2eVerifyCommand(): Command {
  return new Command('e2e-verify')
    .description('Design 문서에서 E2E를 자동 생성하고 실행하여 Composite Score를 산출한다')
    .argument('<sprintNum>', 'Sprint 번호 (예: 279)', parseInt)
    .option('--gap-rate <number>', 'Gap Analysis Match Rate (0~100)', parseFloat, 95)
    .option('--project-root <path>', '프로젝트 루트 경로', process.cwd())
    .option('--json', 'JSON 형식으로 결과 출력')
    .action(async (sprintNum: number, options: { gapRate: number; projectRoot: string; json: boolean }) => {
      const projectRoot = path.resolve(options.projectRoot);

      if (!options.json) {
        console.log(`\n🔍 F526 E2E Verify — Sprint ${sprintNum}`);
        console.log(`   Project: ${projectRoot}`);
        console.log(`   Gap Rate: ${options.gapRate}%\n`);
      }

      const result = await runE2EVerify({
        sprintNum,
        gapRate: options.gapRate,
        projectRoot,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.compositeScore.status === 'PASS' ? 0 : 1);
        return;
      }

      // 사람이 읽을 수 있는 출력
      if (result.error) {
        console.error(`❌ Error: ${result.error}`);
      } else {
        console.log(`📄 Design doc : ${result.designDocPath}`);
        console.log(`📝 Generated  : ${result.generatedSpecPath}`);
        console.log(`🧪 Scenarios  : ${result.scenarioCount}`);
        if (result.e2eResult) {
          const { pass, fail, skip } = result.e2eResult;
          console.log(`✅ E2E PASS   : ${pass} / FAIL: ${fail} / SKIP: ${skip}`);
        } else {
          console.log(`⚠️  E2E        : 실행 불가 (playwright 미설치 또는 오류)`);
        }
      }

      const score = result.compositeScore;
      console.log(`\n📊 Score`);
      console.log(`   Formula  : ${score.formula}`);
      console.log(`   Composite: ${score.compositeRate.toFixed(1)}%`);
      console.log(`   Status   : ${score.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`);

      process.exit(score.status === 'PASS' ? 0 : 1);
    });
}

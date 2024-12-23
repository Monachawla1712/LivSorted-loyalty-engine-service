import { Injectable } from '@nestjs/common';
import { Engine } from 'json-rules-engine';

@Injectable()
export class RulesEngineService {
  private addOperators(rulesEngine: Engine) {
    rulesEngine.addOperator(
      'containsAndGreaterThan',
      (reqValue: Array<any>, ruleValue) => {
        for (const ab of reqValue) {
          if (
            ab['skuCode'] == ruleValue['skuCode'] &&
            ab['finalAmount'] > ruleValue['minValue']
          ) {
            return true;
          }
        }
        return false;
      },
    );
  }

  async checkRulesWithFacts(rulesObject, factsObject) {
    const rulesEngine = new Engine();

    this.addOperators(rulesEngine);

    rulesEngine.addRule(rulesObject);

    const events = await rulesEngine.run(factsObject);

    return events.events;
  }
}

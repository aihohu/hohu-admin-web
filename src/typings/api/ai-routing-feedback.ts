declare namespace Api {
  namespace AiRoutingFeedback {
    interface TopCorrected {
      code: string;
      name: string;
      count: number;
    }

    interface TopWrongAgent {
      agentCode: string;
      agentName: string;
      wrongCount: number;
      topCorrected: TopCorrected | null;
    }

    interface Summary {
      days: number;
      total: number;
      correct: number;
      wrong: number;
      wrongRate: number;
      topWrongAgents: TopWrongAgent[];
    }

    interface ListItem {
      feedbackId: string;
      messageId: string;
      userId: string;
      userName: string;
      originalAgent: string;
      originalAgentName: string;
      feedback: 'correct' | 'wrong';
      correctedAgent: string | null;
      correctedAgentName: string | null;
      traceId: string | null;
      createTime: string;
    }

    interface ListQuery {
      days: number;
      current: number;
      size: number;
      /** `correct` is represented by the unfiltered `all` view, not as a standalone filter */
      feedback?: 'wrong' | 'all';
      originalAgent?: string;
      correctedAgent?: string;
    }
  }
}

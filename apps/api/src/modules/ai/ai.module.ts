import { Global, Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { ResumeParserAgent } from './agents/resume-parser.agent';
import { JobParserAgent } from './agents/job-parser.agent';
import { GapAnalysisAgent } from './agents/gap-analysis.agent';
import { RecommendationAgent } from './agents/recommendation.agent';
import { RoadmapAgent } from './agents/roadmap.agent';
import { CareerCoachAgent } from './agents/career-coach.agent';
import { EmbeddingService } from './embedding.service';

@Global()
@Module({
  providers: [
    AiService,
    EmbeddingService,
    ResumeParserAgent,
    JobParserAgent,
    GapAnalysisAgent,
    RecommendationAgent,
    RoadmapAgent,
    CareerCoachAgent,
  ],
  exports: [
    AiService,
    EmbeddingService,
    ResumeParserAgent,
    JobParserAgent,
    GapAnalysisAgent,
    RecommendationAgent,
    RoadmapAgent,
    CareerCoachAgent,
  ],
})
export class AiModule {}

import { describe, it, expect, beforeEach } from 'vitest';
import { ScoringService } from '../../src/services/ScoringService';
import { Interests } from '../../src/models/Schemas';

describe('ScoringService', () => {
    let scoringService: ScoringService;
    const mockInterests: Interests = {
        categories: {
            'AI & ML': {
                emoji: '🤖',
                brands: ['OpenAI', 'Anthropic', 'Google'],
                keywords: ['LLM', 'Transformer', 'Neural Network'],
                score: 10
            },
            'Gaming': {
                emoji: '🎮',
                brands: ['Sony', 'Nintendo'],
                keywords: ['RPG', 'FPS', 'Switch'],
                score: 8
            }
        }
    };

    beforeEach(() => {
        scoringService = new ScoringService(mockInterests);
    });

    describe('detectCategory', () => {
        it('should detect category based on keywords', () => {
            const title = 'New LLM model released';
            const desc = 'A breakthrough in Neural Networks';
            expect(scoringService.detectCategory(title, desc, 'News')).toBe('AI & ML');
        });

        it('should detect category based on brands', () => {
            const title = 'Sony announces new console';
            const desc = 'The next generation of gaming';
            expect(scoringService.detectCategory(title, desc, 'Tech')).toBe('Gaming');
        });

        it('should respect original category with normalization', () => {
            expect(scoringService.detectCategory('random', 'text', 'AI&ML')).toBe('AI & ML');
            expect(scoringService.detectCategory('random', 'text', 'ai ・ ml')).toBe('AI & ML');
        });

        it('should return original category if no match found', () => {
            expect(scoringService.detectCategory('Cooking tips', 'How to bake a cake', 'Life')).toBe('Life');
        });
    });

    describe('calculateScore', () => {
        it('should return base score of 5 for no matches', () => {
            expect(scoringService.calculateScore('Random title', 'Random desc', 'AI & ML')).toBe(5);
        });

        it('should add 10 points for brand match', () => {
            expect(scoringService.calculateScore('Google AI event', 'Something', 'AI & ML')).toBe(15);
        });

        it('should add 8 points for keyword match', () => {
            expect(scoringService.calculateScore('New LLM techniques', 'Something', 'AI & ML')).toBe(13);
        });

        it('should accumulate scores', () => {
            expect(scoringService.calculateScore('Google released a new LLM', 'Revolutionary', 'AI & ML')).toBe(23);
        });
    });

    describe('extractBrand', () => {
        it('should extract brand from user settings', () => {
            expect(scoringService.extractBrand('OpenAI launches GPT-5')).toBe('OpenAI');
        });

        it('should extract brand from common brands list', () => {
            expect(scoringService.extractBrand('Microsoft Surface update')).toBe('Microsoft');
        });

        it('should return "News" if no brand found', () => {
            expect(scoringService.extractBrand('Weather is nice today')).toBe('News');
        });
    });
});

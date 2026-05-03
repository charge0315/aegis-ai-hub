import { describe, it, expect } from 'vitest';
import { Article, ArticleType } from '../models/Article.js';

describe('Article Model', () => {
    it('should correctly initialize with valid data', () => {
        const data: ArticleType = {
            title: 'Test Article',
            link: 'https://example.com/article',
            desc: 'This is a test article.',
            brand: 'TestBrand',
            score: 8,
            category: 'Tech',
            date: '2023-10-01T12:00:00Z',
            img: 'https://example.com/image.jpg'
        };

        const article = new Article(data);

        expect(article.title).toBe(data.title);
        expect(article.link).toBe(data.link);
        expect(article.desc).toBe(data.desc);
        expect(article.brand).toBe(data.brand);
        expect(article.score).toBe(data.score);
        expect(article.category).toBe(data.category);
        expect(article.date).toBe(data.date);
        expect(article.img).toBe(data.img);
    });

    it('should set default date if not provided', () => {
        const data: ArticleType = {
            title: 'Test Article 3',
            link: 'https://example.com/article3',
            desc: 'Description',
            score: 5,
            category: 'News'
        };

        const article = new Article(data);
        expect(article.date).toBeDefined();
        const dateObj = new Date(article.date);
        expect(isNaN(dateObj.getTime())).toBe(false); // Should be a valid date string
    });
});

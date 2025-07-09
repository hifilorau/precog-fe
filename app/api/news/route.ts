import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Get query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const query = searchParams.get('query') || '';
  const tag = searchParams.get('tag') || '';
  const market = searchParams.get('market') || '';
  const sort = searchParams.get('sort') || 'newest';
  
  try {
    // Build the base query
    let queryBuilder = db
      .selectFrom('news_articles as n')
      .leftJoin('tag_news_associations as tna', 'n.id', 'tna.news_article_id')
      .leftJoin('tags as t', 'tna.tag_id', 't.id')
      .select([
        'n.id',
        'n.title',
        'n.description',
        'n.url',
        'n.image_url as imageUrl',
        'n.published_at as publishedAt',
        'n.source_name as sourceName',
        db.raw('json_agg(distinct jsonb_build_object(\'id\', t.id, \'label\', t.label)) as tags'
      ])
      .groupBy(['n.id', 'n.title', 'n.description', 'n.url', 'n.image_url', 'n.published_at', 'n.source_name']);
    
    // Apply search query filter
    if (query) {
      queryBuilder = queryBuilder.where(eb => 
        eb('n.title', 'ilike', `%${query}%`)
        .or('n.description', 'ilike', `%${query}%`)
        .or('n.content', 'ilike', `%${query}%`)
      );
    }
    
    // Apply tag filter
    if (tag) {
      queryBuilder = queryBuilder.having(
        'bool_or(t.label ilike :tag)', 
        { tag: `%${tag}%` }
      );
    }
    
    // Apply sorting
    if (sort === 'newest') {
      queryBuilder = queryBuilder.orderBy('n.published_at', 'desc');
    } else {
      // For relevance, we'd need a more sophisticated approach with full-text search
      // For now, we'll just sort by published date
      queryBuilder = queryBuilder.orderBy('n.published_at', 'desc');
    }
    
    // Get total count for pagination
    const countQuery = queryBuilder
      .select(eb => [eb.fn.count('n.id').as('count')])
      .executeTakeFirst();
    
    // Apply pagination
    const articlesQuery = queryBuilder
      .limit(limit)
      .offset((page - 1) * limit)
      .execute();
    
    const [countResult, articles] = await Promise.all([countQuery, articlesQuery]);
    
    const totalCount = Number(countResult?.count || 0);
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      data: articles.map(article => ({
        ...article,
        tags: (article.tags || []).filter((t: any) => t.id && t.label) // Filter out null tags
      })),
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
    
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news articles' },
      { status: 500 }
    );
  }
}

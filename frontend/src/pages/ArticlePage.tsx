import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { articlesApi, Article } from '../services/api';
import ReactMarkdown from 'react-markdown';

export default function ArticlePage() {
  const { recommendationId } = useParams<{ recommendationId: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recommendationId) {
      setError('Invalid article ID');
      setLoading(false);
      return;
    }

    const loadArticle = async () => {
      try {
        const response = await articlesApi.getArticle(recommendationId);
        setArticle(response.data);
      } catch (err: any) {
        console.error('Error loading article:', err);
        setError(err.response?.data?.error || 'Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    loadArticle();
  }, [recommendationId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Generating personalized article...</p>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error || 'Article not found'}</p>
          <Link
            to="/"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">{article.title}</h1>
        <p className="text-gray-600 mt-2 text-sm">
          Generated on {new Date(article.generatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Rationale Context */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          <strong>Why this matters for you:</strong> {article.rationale}
        </p>
      </div>

      {/* Article Content */}
      <div className="bg-white rounded-lg shadow p-8 prose prose-lg max-w-none">
        <ReactMarkdown
          components={{
            h2: ({ node, ...props }) => (
              <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4" {...props} />
            ),
            h3: ({ node, ...props }) => (
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="text-gray-700 mb-4 leading-relaxed" {...props} />
            ),
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="ml-4" {...props} />
            ),
            strong: ({ node, ...props }) => (
              <strong className="font-semibold text-gray-900" {...props} />
            ),
            em: ({ node, ...props }) => (
              <em className="italic text-gray-800" {...props} />
            ),
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4" {...props} />
            ),
          }}
        >
          {article.content}
        </ReactMarkdown>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-900">
          <strong>Disclaimer:</strong> {article.disclaimer}
        </p>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex gap-4">
        <Link
          to="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
        <Link
          to="/insights"
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          View Insights
        </Link>
      </div>
    </div>
  );
}


import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { contentApi, ContentItem } from '../services/api';

export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedTopic, setSelectedTopic] = useState<string>(searchParams.get('topic') || '');
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const topics = ['credit', 'savings', 'budgeting', 'debt', 'investing'];

  useEffect(() => {
    loadContent();
  }, [selectedTopic, searchTerm]);

  useEffect(() => {
    // Update URL when filters change
    const params = new URLSearchParams();
    if (selectedTopic) params.set('topic', selectedTopic);
    if (searchTerm) params.set('search', searchTerm);
    setSearchParams(params, { replace: true });
  }, [selectedTopic, searchTerm, setSearchParams]);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await contentApi.getAll(selectedTopic || undefined, searchTerm || undefined);
      setContent(response.data.content);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = content.filter((item) => {
    const matchesSearch = !searchTerm || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTopic = !selectedTopic || item.tags.includes(selectedTopic);
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Education Library</h1>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search articles..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full md:w-auto px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 transition-colors"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem',
              }}
            >
              <option value="">All Topics</option>
              {topics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic.charAt(0).toUpperCase() + topic.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{item.source}</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{item.excerpt}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {item.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                  {tag}
                </span>
              ))}
            </div>
            <Link
              to={`/article/content/${item.id}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center transition-colors"
            >
              Read More →
            </Link>
          </div>
          ))}
        </div>
      )}

      {!loading && filteredContent.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No articles found matching your search criteria.
        </div>
      )}
    </div>
  );
}

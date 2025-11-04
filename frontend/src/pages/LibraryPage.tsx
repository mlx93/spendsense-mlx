import { useState } from 'react';

export default function LibraryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  const topics = ['credit', 'savings', 'budgeting', 'debt', 'investing'];

  // Mock content - in real implementation, this would come from API
  const content = [
    {
      id: '1',
      title: 'Understanding Credit Utilization',
      source: 'NerdWallet',
      excerpt: 'Credit utilization is the percentage of your available credit that you\'re using...',
      url: 'https://www.nerdwallet.com/article/credit-scores/credit-utilization-rate-calculator',
      tags: ['credit', 'utilization'],
    },
    {
      id: '2',
      title: 'Emergency Fund Basics',
      source: 'Investopedia',
      excerpt: 'An emergency fund is a safety net of money to help you cover unexpected expenses...',
      url: 'https://www.investopedia.com/terms/e/emergency_fund.asp',
      tags: ['savings', 'emergency-fund'],
    },
    {
      id: '3',
      title: 'Budgeting for Irregular Income',
      source: 'CFPB',
      excerpt: 'If your income varies from month to month, creating a budget can be challenging...',
      url: 'https://www.consumerfinance.gov/consumer-tools/money-as-you-grow/make-a-budget/',
      tags: ['budgeting', 'income'],
    },
  ];

  const filteredContent = content.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
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
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
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
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
            >
              Read More →
            </a>
          </div>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No articles found matching your search criteria.
        </div>
      )}
    </div>
  );
}

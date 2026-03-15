export default function ComparisonTable() {
  const whatWeLog = [
    {
      category: 'Usage Metrics',
      items: ['Request count per key', 'Tokens used (input/output)', 'Cost per request', 'Model used', 'Timestamp of requests'],
    },
    {
      category: 'Security Events',
      items: ['Rate limit violations', 'Anomaly detection alerts', 'Failed authentication attempts', 'Suspicious patterns detected'],
    },
  ];

  const whatWeDontLog = [
    {
      category: 'Never Stored',
      items: ['Prompt content', 'Response content', 'API keys (never stored decrypted)', 'User conversations', 'Personal data'],
    },
    {
      category: 'Never Shared',
      items: ['Your data with third parties', 'Your prompts with AI providers beyond routing', 'Your usage data with anyone'],
    },
  ];

  return (
    <div className="space-y-8">
      {/* What We Log */}
      <div>
        <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          What We Log
        </h3>
        <div className="overflow-hidden rounded-lg border border-green-200 dark:border-green-800">
          <table className="min-w-full divide-y divide-green-200 dark:divide-green-800">
            <thead className="bg-green-50 dark:bg-green-900/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-green-800 dark:text-green-200 uppercase tracking-wider">
                  Data Logged
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-green-200 dark:divide-green-800">
              {whatWeLog.map((section, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200">
                      {section.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="space-y-1">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* What We Don't Log */}
      <div>
        <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
          <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          What We Don't Log
        </h3>
        <div className="overflow-hidden rounded-lg border border-red-200 dark:border-red-800">
          <table className="min-w-full divide-y divide-red-200 dark:divide-red-800">
            <thead className="bg-red-50 dark:bg-red-900/20">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 dark:text-red-200 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 dark:text-red-200 uppercase tracking-wider">
                  Never Logged
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-red-200 dark:divide-red-800">
              {whatWeDontLog.map((section, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200">
                      {section.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="space-y-1">
                      {section.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                          <svg className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Notice */}
      <div className="md:hidden p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          Swipe horizontally to view all columns
        </p>
      </div>
    </div>
  );
}

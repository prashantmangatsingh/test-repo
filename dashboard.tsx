// pages/dashboard.tsx
import { NextPage } from 'next';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Octokit } from 'octokit';

interface PR {
  id: number;
  title: string;
  html_url: string;
  repo: string;
  number: number;
  created_at: string;
}

const Dashboard: NextPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prs, setPrs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (status === 'authenticated' && session?.accessToken) {
      fetchUserPRs(session.accessToken as string);
    }
  }, [status, session]);

  const fetchUserPRs = async (token: string) => {
    try {
      const octokit = new Octokit({ auth: token });
      const { data } = await octokit.request('GET /user/repos', {
        per_page: 100,
      });

      // Get PRs from all repositories
      const allPrs: PR[] = [];
      for (const repo of data) {
        const { data: repoPrs } = await octokit.request(
          'GET /repos/{owner}/{repo}/pulls',
          {
            owner: repo.owner.login,
            repo: repo.name,
            state: 'open',
          }
        );

        repoPrs.forEach((pr: any) => {
          allPrs.push({
            id: pr.id,
            title: pr.title,
            html_url: pr.html_url,
            repo: repo.full_name,
            number: pr.number,
            created_at: pr.created_at,
          });
        });
      }

      setPrs(allPrs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (error) {
      console.error('Error fetching PRs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="flex items-center mb-4">
            <img
              src={session.user?.image || ''}
              alt="User avatar"
              className="w-12 h-12 rounded-full mr-4"
            />
            <div>
              <p className="text-lg font-semibold">
                Welcome, {session.user?.name}!
              </p>
              <p className="text-gray-600">
                NexGenGit is monitoring your repositories for new pull requests.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">How it works:</h3>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>Create a new pull request in any of your repositories</li>
              <li>Our AI will automatically review the changes</li>
              <li>Check the PR comments for detailed feedback</li>
            </ul>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Your Recent Pull Requests</h2>
          {prs.length > 0 ? (
            <div className="space-y-4">
              {prs.map((pr) => (
                <div
                  key={pr.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {pr.title} #{pr.number}
                      </a>
                      <p className="text-sm text-gray-500 mt-1">
                        {pr.repo} • {new Date(pr.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Pending Review
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No open pull requests found in your repositories.
              </p>
              <p className="text-gray-400 mt-2">
                Create a new PR to see the AI review in action.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
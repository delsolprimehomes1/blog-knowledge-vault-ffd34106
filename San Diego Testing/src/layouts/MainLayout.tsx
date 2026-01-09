import { Outlet, Link } from 'react-router-dom';

export function MainLayout() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link to="/" className="text-xl font-bold text-blue-600">
                            San Diego Testing
                        </Link>
                    </div>
                    <nav className="flex space-x-4">
                        <Link to="/login" className="text-gray-600 hover:text-gray-900 font-medium">
                            Provider Login
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="flex-grow">
                <Outlet />
            </main>
            <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 text-center text-gray-400 text-sm">
                    © 2024 San Diego Testing. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

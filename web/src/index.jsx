import { LocationProvider, Router, Route, hydrate, prerender as ssr } from 'preact-iso';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home.jsx';
import { NotFound } from './pages/_404.jsx';
import './style.css';
import { Apps } from './pages/Apps.jsx';
import { Docs } from './components/Docs.jsx';
import { UserSettings } from './pages/UserSettings.jsx';
import { ToastProvider } from './ToastContext';

export function App() {
	return (
		<LocationProvider>
			<ToastProvider>
				<div className="flex flex-col h-screen bg-white dark:bg-slate-950">
				<Header />
				
				<main className=" flex-1 overflow-y-auto">
					<Router>
						<Route path="/" component={Home} />
						<Route path="/apps" component={Apps} />
						<Route path="/docs" component={Docs} />
						<Route path="/notifications" component={UserSettings} />

						<Route default component={NotFound} />
					</Router>
				</main>
				</div>
			</ToastProvider>
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app'));
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}

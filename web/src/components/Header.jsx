import { useLocation } from "preact-iso";
import { useState } from "preact/hooks";
import { Rss, Menu, X, Bell, Sun, Moon } from "lucide-preact";
import icon from "../assets/icon.svg";
import { useTheme } from "../useTheme";
import { Button } from "./Button";

export function Header() {
	const { theme, toggleTheme } = useTheme();
	const { url } = useLocation();
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	const navClass = (path) =>
		`transition-colors hover:text-black hover:dark:text-white ${
			url === path
				? "text-black dark:text-white font-semibold"
				: "text-zinc-500 dark:text-zinc-400"
		}`;

	const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

	return (
		<header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
			<div className="container mx-auto flex h-16 items-center justify-between px-4">
				{/* Logo & Brand */}
				<a
					href="/"
					className="flex items-center gap-2 hover:opacity-90 transition-opacity relative z-50"
				>
					<div className="flex h-8 w-8 items-center justify-center">
						<img src={icon} className="w-8 h-8" alt="VersionSignal Logo" />
					</div>
					<span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						PKG
					</span>
				</a>

				{/* Desktop Navigation */}
				<nav className="hidden md:flex items-center gap-8 text-sm font-medium">
					<a href="/" className={navClass("/")}>
						Home
					</a>
					<a href="/apps" className={navClass("/apps")}>
						Applications
					</a>
					<a href="/docs" className={navClass("/docs")}>
						Documentation
					</a>
				</nav>

				{/* Action Area */}
				<div className="flex items-center gap-2 lg:gap-4">
					<Button variant="ghost" onClick={toggleTheme}>
						{theme === 'dark' ? (
							<Sun size={20} class="text-zinc-100" />
						) : (
							<Moon size={20} class="text-zinc-900" />
						)}
					</Button>
					{/* Notifications Bell */}
                    <a
                        href="/notifications"
                        title="Notification Settings"
                        className={`p-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 ${
                            url === "/notifications" 
                                ? "text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-900" 
                                : "text-zinc-500 dark:text-zinc-400"
                        }`}
                    >
                        <Bell size={20} fill={url === "/notifications" ? "currentColor" : "none"} />
                    </a>
					<a
						href="/feed.xml"
						target="_blank"
						title="RSS Feed"
						className="p-2 rounded-lg text-zinc-500 hover:bg-orange-50 hover:text-orange-600 dark:text-zinc-400 dark:hover:bg-orange-950/30 dark:hover:text-orange-400 transition-colors">
						<Rss size={20} />
					</a>

					{/* Mobile Menu Toggle */}
					<button
						onClick={toggleMenu}
						className="p-2 md:hidden rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 transition-colors relative z-50"
						aria-label="Toggle Menu">
						{isMenuOpen ? <X size={24} /> : <Menu size={24} />}
					</button>
				</div>
			</div>

			{/* Mobile Navigation Overlay */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-40 bg-white dark:bg-zinc-950 w-screen h-screen md:hidden">
					{/* Inner container for alignment */}
					<nav className="container mx-auto px-6 pt-24 flex flex-col gap-8">
						<a
							href="/"
							onClick={toggleMenu}
							className={`text-2xl ${navClass("/")}`}>
							Home
						</a>
						<a
							href="/apps"
							onClick={toggleMenu}
							className={`text-2xl ${navClass("/apps")}`}>
							Applications
						</a>
						<a
							href="/docs"
							onClick={toggleMenu}
							className={`text-2xl ${navClass("/docs")}`}>
							Documentation
						</a>

						<div className="h-px w-full bg-zinc-200 dark:bg-zinc-800 my-2" />
					</nav>
				</div>
			)}
		</header>
	);
}

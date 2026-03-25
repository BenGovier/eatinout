'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RestaurantNav } from '@/components/restaurant-nav';
import { Logo } from '@/components/logo';
import { SignOutButton } from '@/components/sign-out-button';
import { Home, Pizza, PlusCircle, Settings, Tag, Trash2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Spinner } from '@/components/ui/spinner';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';

interface User {
	userId: string;
	email: string;
	role: string;
	firstName: string;
	lastName: string;
	restaurantId?: string;
	subscriptionStatus?: string;
}
const navItems = [
	{
		title: "Dashboard",
		href: "/dashboard",
		icon: Home,
	},
	{
		title: "Restaurants",
		href: "/dashboard/restaurant",
		icon: Pizza,
	},
	{
		title: "Offers",
		href: "/dashboard/offers",
		icon: Tag,
	},
	// {
	// 	title: "Create Offer",
	// 	href: "/dashboard/offers/create",
	// 	icon: PlusCircle,
	// },
	{
		title: "Settings",
		href: "/dashboard/settings",
		icon: Settings,
	},
	// {
	//   title: "Analytics",
	//   href: "/dashboard/analytics",
	//   icon: BarChart,
	// },
	// {
	//   title: "Settings",
	//   href: "/dashboard/settings",
	//   icon: Settings,
	// }, 
]

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const verifyAuth = async () => {
			try {
				setAuthLoading(true);
				const response = await fetch('/api/auth/verify-token', {
					method: 'POST',
					credentials: 'include',
				});

				const data = await response.json();

				if (response.ok && data.success && data.user) {
					// Check if user is restaurant
					if (data.user.role === 'restaurant') {
						setUser(data.user);
					} else {
						console.error('Unauthorized: Not a restaurant');
						router.push('/sign-in');
					}
				} else {
					console.error('Authentication failed');
					router.push('/sign-in');
				}
			} catch (error) {
				console.error('Auth verification error:', error);
				router.push('/sign-in');
			} finally {
				setAuthLoading(false);
			}
		};

		verifyAuth();
	}, [router]);

	const handleDeleteAccount = async () => {
		try {
			setIsProcessing(true);
			await axios.post('/api/delete-account');
			toast.success('Thanks, customer service will process your request and confirm within 48 hours.');
			setOpenDeleteDialog(false);
		} catch (error) {
			toast.error('Error processing account deletion request');
		} finally {
			setIsProcessing(false);
		}
	};

	// Show loading while checking authentication
	if (authLoading) {
		return <Spinner />;
	}

	// If not authenticated or not restaurant, show loading while redirecting
	if (!user || user.role !== 'restaurant') {
		return <Spinner />;
	}

	const toggleMenu = () => {
		setIsMenuOpen((prev) => !prev);
	};

	return (
		<div className="flex min-h-screen flex-col">
			<header className="sticky top-0 z-50 w-full border-b bg-background">
				<div className="container flex h-16 items-center justify-between">
					<Link href="/dashboard" className="flex items-center gap-2">
						<Logo href="/dashboard" />
						<span className="font-bold">Restaurant Portal</span>
					</Link>
					<div className="flex items-center gap-4 md:hidden">
						{/* Hamburger Menu Button */}
						<button
							className="flex items-center px-3 py-2 border rounded text-gray-600 border-gray-600 hover:text-red-600 hover:border-red-600"
							onClick={toggleMenu}
						>
							<svg
								className="fill-current h-3 w-3"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<title>Menu</title>
								<path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
							</svg>
						</button>
					</div>
					<div className="hidden md:flex items-center gap-4">
						{/* Delete Account (Desktop) */}
						{/* <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
							<DialogTrigger asChild>
								<Button variant="destructive" size="sm">
									<Trash2 className="h-4 w-4 mr-2" /> Delete Account
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Are you sure?</DialogTitle>
									<DialogDescription>
										Thanks, customer service will process your request and confirm within 48 hours. Your information will be deleted from EATINOUT.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter className="flex flex-row flex-wrap justify-end gap-2 sm:gap-3">
									<div
										onClick={() => setOpenDeleteDialog(false)}
										className="flex items-center text-gray-600 cursor-pointer px-4 py-2 border rounded-md"
										role="button"
									>
										No
									</div>
									<div
										onClick={handleDeleteAccount}
										className="flex items-center text-red-600 cursor-pointer px-4 py-2 border border-red-600 rounded-md"
										role="button"
									>
										{isProcessing ? (
											<div className="flex items-center">
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
												<span>Processing...</span>
											</div>
										) : (
											<>
												<Trash2 className="h-4 w-4 mr-2" />
												<span>Yes, Delete</span>
											</>
										)}
									</div>
								</DialogFooter>
							</DialogContent>
						</Dialog> */}
						<Button variant="outline" size="sm">
							<SignOutButton />
						</Button>
					</div>
				</div>
			</header>

			{/* Mobile Navigation */}
			{isMenuOpen && (
				<nav className="md:hidden absolute top-16 left-0 w-full bg-white shadow-lg z-50">
					<ul className="flex flex-col space-y-2 p-4">
						{/* RestaurantNav Links */}
						{navItems.map((item) => (
							<li key={item.href}>
								<Link
									href={item.href}
									className="block text-sm font-medium transition-colors hover:text-red-600 text-gray-800"
									onClick={() => setIsMenuOpen(false)} // Close menu on link click
								>
									<div className="flex items-center gap-2">
										<item.icon className="h-5 w-5" />
										<span>{item.title}</span>
									</div>
								</Link>
							</li>
						))}

						{/* Delete Account (Mobile) */}
						<li>
							<Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
								{/* <DialogTrigger asChild>
									<button
										className="block w-full text-left text-sm font-medium transition-colors text-red-600"
										onClick={() => setIsMenuOpen(false)}
									>
										<div className="flex items-center gap-2">
											<Trash2 className="h-5 w-5" />
											<span>Delete Account</span>
										</div>
									</button>
								</DialogTrigger> */}
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Are you sure?</DialogTitle>
										<DialogDescription>
											Thanks, customer service will process your request and confirm within 48 hours. Your information will be deleted from EATINOUT.
										</DialogDescription>
									</DialogHeader>
									<DialogFooter className="flex flex-row flex-wrap justify-end gap-2 sm:gap-3">
										<div
											onClick={() => setOpenDeleteDialog(false)}
											className="flex items-center text-gray-600 cursor-pointer px-4 py-2 border rounded-md"
											role="button"
										>
											No
										</div>
										<div
											onClick={handleDeleteAccount}
											className="flex items-center text-red-600 cursor-pointer px-4 py-2 border border-red-600 rounded-md"
											role="button"
										>
											{isProcessing ? (
												<div className="flex items-center">
													<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
													<span>Processing...</span>
												</div>
											) : (
												<>
													<Trash2 className="h-5 w-5 mr-2" />
													<span>Yes, Delete</span>
												</>
											)}
										</div>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</li>

						{/* Help and SignOutButton */}
						{/* <li>
							<button
								className="block text-sm font-medium transition-colors hover:text-red-600 text-gray-800"
								onClick={() => {
									setIsMenuOpen(false);
									// Add Help logic here
								}}
							>
								Help
							</button>
						</li> */}
						<li>
							<Button variant="outline" size="sm">
								<SignOutButton />
							</Button>
						</li>
					</ul>
				</nav>
			)}

			<div className="flex flex-1">
				<RestaurantNav />
				<main className="flex-1 p-6 overflow-hidden">{children}</main>
			</div>
		</div>
	);
}


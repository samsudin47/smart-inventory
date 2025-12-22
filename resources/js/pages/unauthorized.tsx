import { dashboard, login } from '@/routes';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

export default function Unauthorized() {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Akses Ditolak" />

            <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
                <div className="flex flex-grow items-center justify-center p-6">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
                        <div className="text-center">
                            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>

                            <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Akses Ditolak</h1>

                            <p className="mb-6 text-gray-600 dark:text-gray-300">
                                Anda tidak memiliki izin untuk mengakses halaman ini.
                                {auth.user && (
                                    <>
                                        {' '}
                                        Peran Anda sebagai <span className="font-semibold">{auth.user.role}</span> tidak memiliki akses ke halaman
                                        ini.
                                    </>
                                )}
                            </p>

                            <div className="flex flex-col justify-center gap-4 sm:flex-row">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                                    >
                                        Kembali ke Dashboard
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-5 py-2 font-semibold text-white transition hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                                    >
                                        Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

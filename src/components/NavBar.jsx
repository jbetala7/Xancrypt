// import React, { useEffect, useState } from 'react';
// import { Link } from 'react-router-dom';

// export default function NavBar() {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);

//   useEffect(() => {
//     setIsLoggedIn(!!localStorage.getItem('token'));
//   }, []);

//   const handleLogout = () => {
//     localStorage.removeItem('token');
//     setIsLoggedIn(false);
//     window.location.href = '/auth'; // redirect to login page
//   };

//   return (
//     <nav className="flex justify-end p-4 space-x-4">
//       {isLoggedIn ? (
//         <button
//           onClick={handleLogout}
//           className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
//         >
//           Logout
//         </button>
//       ) : (
//         <Link
//           to="/auth"
//           className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
//         >
//           Login
//         </Link>
//       )}
//     </nav>
//   );
// }

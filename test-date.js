const formatDate = (dateString) => {
  if (!dateString) return '';
  // If it's already DD/MM/YYYY, leave it alone.
  if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
    // wait, what if it's MM/DD/YYYY? 
    // Usually OPUSS exports "YYYY-MM-DD" or similar if they say it's english format.
  }
}

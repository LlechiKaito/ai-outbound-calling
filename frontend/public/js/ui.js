function esc(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatPhone(phone) {
  if (!phone) return '';
  if (phone.startsWith('+81')) return '0' + phone.slice(3);
  return phone;
}

function statusBadge(status) {
  if (!status || status === '未対応') {
    return '<span class="status-badge bg-yellow-100 text-yellow-700">未対応</span>';
  }
  if (status === 'フォロー中') {
    return '<span class="status-badge bg-blue-100 text-blue-700">フォロー中</span>';
  }
  if (status === '対応済み') {
    return '<span class="status-badge bg-green-100 text-green-700">対応済み</span>';
  }
  return '<span class="status-badge bg-gray-100 text-gray-600">' + esc(status) + '</span>';
}

function resultBadge(result) {
  if (!result) return '-';
  if (result === '応答') {
    return '<span class="status-badge bg-green-100 text-green-700">応答</span>';
  }
  if (result === '不在') {
    return '<span class="status-badge bg-orange-100 text-orange-700">不在</span>';
  }
  return esc(result);
}

function interestBar(level) {
  if (!level) return '-';
  const n = parseInt(level, 10);
  if (isNaN(n)) return '-';
  const color = n >= 7 ? 'bg-green-500' : n >= 4 ? 'bg-yellow-500' : 'bg-red-500';
  return '<div class="flex items-center gap-1">'
    + '<div class="w-16 bg-gray-200 rounded-full h-1.5">'
    + '<div class="' + color + ' h-1.5 rounded-full" style="width:' + (n * 10) + '%"></div>'
    + '</div>'
    + '<span class="text-xs">' + n + '</span>'
    + '</div>';
}

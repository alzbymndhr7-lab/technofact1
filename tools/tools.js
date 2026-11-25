/* Shared navigation for Techno Fact tools: fills #tnav and #tmore from one list. */
(function () {
  var TOOLS = [
    ['scam-message-checker', 'فاحص رسائل الاحتيال', 'اكشف علامات النصب في أي رسالة وصلتك'],
    ['link-checker', 'هل هذا الرابط مشبوه؟', 'افحص أي رابط قبل أن تضغط عليه'],
    ['password-leak-checker', 'هل تسرّبت كلمة سري؟', 'اعرف إن ظهرت كلمة سرك في تسريبات'],
    ['password-checker', 'فاحص قوة كلمة السر', 'كم يحتاج المخترق لتخمين كلمتك'],
    ['password-generator', 'مولّد كلمات السر', 'كلمة سر قوية وعشوائية بضغطة زر'],
    ['qr-generator', 'مولّد رمز QR', 'لرابط أو نص أو شبكة واي فاي'],
    ['prompt-generator', 'مولّد البرومبتات', 'برومبت مرتب لأي مهمة بالذكاء الاصطناعي']
  ];
  var here = (location.pathname.match(/tools\/([^\/]+)/) || [])[1];
  var nav = document.getElementById('tnav');
  if (nav) {
    var sel = '<label class="sr" for="tsel">انتقل إلى أداة</label><select id="tsel" class="tsel">' +
      TOOLS.map(function (t) { return '<option value="../' + t[0] + '/"' + (t[0] === here ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') +
      '</select><a href="../../#projects">كل المشاريع</a>';
    nav.innerHTML = sel;
    document.getElementById('tsel').addEventListener('change', function () { location.href = this.value; });
  }
  var more = document.getElementById('tmore');
  if (more) {
    more.innerHTML = TOOLS.filter(function (t) { return t[0] !== here; }).map(function (t) {
      return '<a href="../' + t[0] + '/"><b>' + t[1] + '</b><small>' + t[2] + '</small></a>';
    }).join('');
  }
})();

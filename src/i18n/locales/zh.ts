export default {
  title: 'AI Diss 年度总结',
  subtitle: '基于你的社交媒体数据，AI 将为你生成一份独特的年度总结',
  description: '可以是幽默的 Diss，也可以是温暖的夸夸',
  nav: {
    about: '关于',
    history: '历史记录'
  },
  form: {
    platform: {
      github: 'GitHub',
      twitter: 'Twitter',
      jike: '即刻'
    },
    username: {
      label: '输入你的{{platform}}用户名',
      placeholder: '例如: your_{{platform}}_username'
    },
    style: {
      label: '选择风格',
      humor: '幽默风',
      sarcasm: '讽刺风',
      praise: '夸夸风'
    },
    submit: '生成总结'
  }
} 
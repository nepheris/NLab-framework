export class SEOWiz {
  model(input = {}) {
    return {
      title: input.title ?? '',
      description: input.description ?? '',
      canonical: input.canonical ?? input.url ?? '',
      language: input.language ?? 'fr',
      robots: input.robots ?? 'index,follow',
      image: input.image ?? input.shareImage ?? null,
      author: input.author ?? null,
      datePublished: input.datePublished ?? null,
      dateModified: input.dateModified ?? null,
      breadcrumbs: input.breadcrumbs ?? [],
      jsonLd: input.jsonLd ?? null
    };
  }

  apply(model, doc = document) {
    const data=this.model(model);
    doc.documentElement.lang=data.language;
    if(data.title) doc.title=data.title;
    const meta=(name,value,property=false)=>{ if(!value)return; const selector=property?`meta[property="${name}"]`:`meta[name="${name}"]`; let node=doc.head.querySelector(selector); if(!node){ node=doc.createElement('meta'); node.setAttribute(property?'property':'name',name); doc.head.append(node); } node.content=String(value); };
    meta('description',data.description); meta('robots',data.robots);
    meta('og:title',data.title,true); meta('og:description',data.description,true); meta('og:url',data.canonical,true); meta('og:image',data.image,true);
    meta('twitter:card',data.image?'summary_large_image':'summary'); meta('twitter:title',data.title); meta('twitter:description',data.description); meta('twitter:image',data.image);
    let canonical=doc.head.querySelector('link[rel="canonical"]'); if(!canonical){ canonical=doc.createElement('link'); canonical.rel='canonical'; doc.head.append(canonical); } canonical.href=data.canonical;
    const old=doc.head.querySelector('script[data-nlab-jsonld]'); old?.remove();
    if(data.jsonLd){ const script=doc.createElement('script'); script.type='application/ld+json'; script.dataset.nlabJsonld='true'; script.textContent=JSON.stringify(data.jsonLd); doc.head.append(script); }
    return data;
  }

  breadcrumbJsonLd(model) {
    const data=this.model(model); if(!data.breadcrumbs.length)return null;
    return { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:data.breadcrumbs.map((item,index)=>({ '@type':'ListItem', position:index+1, name:item.name, item:item.url })) };
  }
}

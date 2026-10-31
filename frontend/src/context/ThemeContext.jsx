import {createContext,useState,useEffect} from 'react';
export const ThemeContext=createContext();
export function ThemeProvider({children}){
  const [dark,setDark]=useState(false);
  useEffect(()=>{document.body.style.background=dark?'#0f172a':'#f8fafc';document.body.style.color=dark?'#fff':'#0f172a';},[dark]);
  return <ThemeContext.Provider value={{dark,setDark}}>{children}</ThemeContext.Provider>
}

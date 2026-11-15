import { libraryRepoContract } from "./repoContract";
import { memoryLibraryRepo } from "./repo.memory";

libraryRepoContract(async (data) => memoryLibraryRepo(data));
